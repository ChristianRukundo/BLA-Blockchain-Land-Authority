import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Inheritance, InheritanceStatus } from './entities/inheritance.entity';
import { InheritanceRequest, RequestStatus } from './entities/inheritance-request.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { LaisService } from '../lais/lais.service';
import { NotificationType } from '../notification/enums/notification.enum';
import {
  CreateInheritanceDto,
  UpdateInheritanceDto,
  CreateInheritanceRequestDto,
  ProcessInheritanceRequestDto,
  InheritanceResponseDto,
  InheritanceListResponseDto,
  InheritanceRequestResponseDto,
  InheritanceRequestListResponseDto,
  InheritanceStatisticsDto,
} from './dto/inheritance.dto';

@Injectable()
export class InheritanceService {
  private readonly logger = new Logger(InheritanceService.name);

  constructor(
    @InjectRepository(Inheritance)
    private readonly inheritanceRepository: Repository<Inheritance>,
    @InjectRepository(InheritanceRequest)
    private readonly inheritanceRequestRepository: Repository<InheritanceRequest>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly blockchainService: BlockchainService,
    private readonly laisService: LaisService,
  ) {}

  async createInheritance(createInheritanceDto: CreateInheritanceDto): Promise<Inheritance> {
    try {
      // Verify the land parcel exists
      const landParcel = await this.laisService.findLandParcelById(createInheritanceDto.landParcelId);
      if (!landParcel) {
        throw new BadRequestException('Land parcel not found');
      }

      // Store inheritance details in IPFS
      const inheritanceData = {
        landParcelId: createInheritanceDto.landParcelId,
        currentOwner: createInheritanceDto.currentOwner,
        designatedHeir: createInheritanceDto.designatedHeir,
        conditions: createInheritanceDto.conditions,
        createdAt: new Date().toISOString(),
      };

      const ipfsHash = await this.ipfsService.uploadJson(inheritanceData);

      const inheritance = this.inheritanceRepository.create({
        ...createInheritanceDto,
        ipfsHash,
        status: InheritanceStatus.ACTIVE,
      });

      const savedInheritance = await this.inheritanceRepository.save(inheritance);
      this.logger.log(`Inheritance created with ID: ${savedInheritance.id}`);

      // Update the land parcel with heir information
      await this.laisService.updateLandParcel(createInheritanceDto.landParcelId, {
        nominatedHeir: createInheritanceDto.designatedHeir,
      });

      // Send notification to the designated heir
      await this.notificationService.create({
        userId: createInheritanceDto.designatedHeir,
        type: NotificationType.INHERITANCE_DESIGNATED,
        title: 'You Have Been Designated as an Heir',
        message: `You have been designated as the heir for land parcel ${landParcel.title}`,
        data: { 
          inheritanceId: savedInheritance.id,
          landParcelId: createInheritanceDto.landParcelId,
          currentOwner: createInheritanceDto.currentOwner,
        },
      });

      return savedInheritance;
    } catch (error) {
      this.logger.error('Failed to create inheritance', error);
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: InheritanceStatus,
    currentOwner?: string,
    designatedHeir?: string,
  ): Promise<InheritanceListResponseDto> {
    try {
      const where: FindOptionsWhere<Inheritance> = {};
      
      if (status) where.status = status;
      if (currentOwner) where.currentOwner = currentOwner.toLowerCase();
      if (designatedHeir) where.designatedHeir = designatedHeir.toLowerCase();

      const [inheritances, total] = await this.inheritanceRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        inheritances: inheritances.map(inheritance => this.mapToResponseDto(inheritance)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch inheritances', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Inheritance> {
    try {
      const inheritance = await this.inheritanceRepository.findOne({ where: { id } });
      if (!inheritance) {
        throw new NotFoundException(`Inheritance with ID ${id} not found`);
      }
      return inheritance;
    } catch (error) {
      this.logger.error(`Failed to find inheritance with ID: ${id}`, error);
      throw error;
    }
  }

  async findByLandParcel(landParcelId: string): Promise<Inheritance | null> {
    try {
      return await this.inheritanceRepository.findOne({
        where: { landParcelId, status: InheritanceStatus.ACTIVE },
      });
    } catch (error) {
      this.logger.error(`Failed to find inheritance for land parcel: ${landParcelId}`, error);
      throw error;
    }
  }

  async update(id: string, updateInheritanceDto: UpdateInheritanceDto): Promise<Inheritance> {
    try {
      const inheritance = await this.findOne(id);

      // Only allow updates if inheritance is still active
      if (inheritance.status !== InheritanceStatus.ACTIVE) {
        throw new BadRequestException('Cannot update inheritance that is not active');
      }

      Object.assign(inheritance, updateInheritanceDto);
      const updatedInheritance = await this.inheritanceRepository.save(inheritance);
      
      this.logger.log(`Inheritance updated with ID: ${id}`);
      return updatedInheritance;
    } catch (error) {
      this.logger.error(`Failed to update inheritance with ID: ${id}`, error);
      throw error;
    }
  }

  async createInheritanceRequest(createRequestDto: CreateInheritanceRequestDto): Promise<InheritanceRequest> {
    try {
      // Verify the inheritance exists and is active
      const inheritance = await this.findOne(createRequestDto.inheritanceId);
      if (inheritance.status !== InheritanceStatus.ACTIVE) {
        throw new BadRequestException('Inheritance is not active');
      }

      // Verify the requester is the designated heir
      if (inheritance.designatedHeir.toLowerCase() !== createRequestDto.requestedBy.toLowerCase()) {
        throw new BadRequestException('Only the designated heir can request inheritance');
      }

      // Store request evidence in IPFS
      const requestData = {
        inheritanceId: createRequestDto.inheritanceId,
        requestedBy: createRequestDto.requestedBy,
        deathCertificateHash: createRequestDto.deathCertificateHash,
        additionalEvidence: createRequestDto.additionalEvidence,
        createdAt: new Date().toISOString(),
      };

      const ipfsHash = await this.ipfsService.uploadJson(requestData);

      const request = this.inheritanceRequestRepository.create({
        ...createRequestDto,
        ipfsHash,
        status: RequestStatus.PENDING,
      });

      const savedRequest = await this.inheritanceRequestRepository.save(request);
      this.logger.log(`Inheritance request created with ID: ${savedRequest.id}`);

      // Trigger oracle verification process
      await this.triggerOracleVerification(savedRequest);

      return savedRequest;
    } catch (error) {
      this.logger.error('Failed to create inheritance request', error);
      throw error;
    }
  }

  async processInheritanceRequest(
    requestId: string,
    processDto: ProcessInheritanceRequestDto,
  ): Promise<InheritanceRequest> {
    try {
      const request = await this.inheritanceRequestRepository.findOne({
        where: { id: requestId },
        relations: ['inheritance'],
      });

      if (!request) {
        throw new NotFoundException(`Inheritance request with ID ${requestId} not found`);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException('Request is not pending processing');
      }

      // Update request status based on verification result
      request.status = processDto.approved ? RequestStatus.APPROVED : RequestStatus.REJECTED;
      request.processedAt = new Date();
      request.processedBy = processDto.processedBy;
      request.verificationNotes = processDto.verificationNotes;
      request.oracleVerificationTxHash = processDto.oracleVerificationTxHash;

      if (processDto.approved) {
        // Execute the inheritance transfer
        await this.executeInheritanceTransfer(request);
      }

      const updatedRequest = await this.inheritanceRequestRepository.save(request);
      this.logger.log(`Inheritance request processed: ${requestId} - ${request.status}`);

      // Send notification to the heir
      await this.notificationService.create({
        userId: request.requestedBy,
        type: processDto.approved ? NotificationType.INHERITANCE_APPROVED : NotificationType.INHERITANCE_REJECTED,
        title: processDto.approved ? 'Inheritance Request Approved' : 'Inheritance Request Rejected',
        message: processDto.approved 
          ? 'Your inheritance request has been approved and the land transfer is being processed'
          : `Your inheritance request has been rejected: ${processDto.verificationNotes}`,
        data: { 
          requestId,
          inheritanceId: request.inheritanceId,
          approved: processDto.approved,
          notes: processDto.verificationNotes,
        },
      });

      return updatedRequest;
    } catch (error) {
      this.logger.error(`Failed to process inheritance request with ID: ${requestId}`, error);
      throw error;
    }
  }

  async executeInheritanceTransfer(request: InheritanceRequest): Promise<void> {
    try {
      const inheritance = await this.findOne(request.inheritanceId);
      
      // Execute the transfer on-chain
      const txHash = await this.blockchainService.executeInheritanceTransfer({
        landParcelId: inheritance.landParcelId,
        currentOwner: inheritance.currentOwner,
        newOwner: inheritance.designatedHeir,
        requestId: request.id,
        verificationHash: request.oracleVerificationTxHash,
      });

      // Update inheritance status
      inheritance.status = InheritanceStatus.COMPLETED;
      inheritance.completedAt = new Date();
      inheritance.transferTxHash = txHash;
      await this.inheritanceRepository.save(inheritance);

      // Update land parcel ownership
      await this.laisService.updateLandParcel(inheritance.landParcelId, {
        ownerAddress: inheritance.designatedHeir,
        nominatedHeir: null, // Clear the heir designation
      });

      this.logger.log(`Inheritance transfer executed: ${inheritance.id} - TX: ${txHash}`);
    } catch (error) {
      this.logger.error('Failed to execute inheritance transfer', error);
      throw error;
    }
  }

  async cancelInheritance(id: string, cancelledBy: string, reason: string): Promise<Inheritance> {
    try {
      const inheritance = await this.findOne(id);

      if (inheritance.status !== InheritanceStatus.ACTIVE) {
        throw new BadRequestException('Can only cancel active inheritances');
      }

      inheritance.status = InheritanceStatus.CANCELLED;
      inheritance.cancelledAt = new Date();
      inheritance.cancelledBy = cancelledBy;
      inheritance.cancellationReason = reason;

      const updatedInheritance = await this.inheritanceRepository.save(inheritance);
      this.logger.log(`Inheritance cancelled by ${cancelledBy}: ${id}`);

      // Clear heir designation from land parcel
      await this.laisService.updateLandParcel(inheritance.landParcelId, {
        nominatedHeir: null,
      });

      return updatedInheritance;
    } catch (error) {
      this.logger.error(`Failed to cancel inheritance with ID: ${id}`, error);
      throw error;
    }
  }

  async getInheritanceRequests(
    page: number = 1,
    limit: number = 10,
    status?: RequestStatus,
    requestedBy?: string,
  ): Promise<InheritanceRequestListResponseDto> {
    try {
      const where: FindOptionsWhere<InheritanceRequest> = {};
      
      if (status) where.status = status;
      if (requestedBy) where.requestedBy = requestedBy.toLowerCase();

      const [requests, total] = await this.inheritanceRequestRepository.findAndCount({
        where,
        relations: ['inheritance'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        requests: requests.map(request => this.mapRequestToResponseDto(request)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch inheritance requests', error);
      throw error;
    }
  }

  async getStatistics(): Promise<InheritanceStatisticsDto> {
    try {
      const totalInheritances = await this.inheritanceRepository.count();
      const totalRequests = await this.inheritanceRequestRepository.count();
      
      const inheritancesByStatus = {} as Record<InheritanceStatus, number>;
      for (const status of Object.values(InheritanceStatus)) {
        inheritancesByStatus[status] = await this.inheritanceRepository.count({
          where: { status },
        });
      }

      const requestsByStatus = {} as Record<RequestStatus, number>;
      for (const status of Object.values(RequestStatus)) {
        requestsByStatus[status] = await this.inheritanceRequestRepository.count({
          where: { status },
        });
      }

      // Calculate average processing time for approved requests
      const approvedRequests = await this.inheritanceRequestRepository.find({
        where: { status: RequestStatus.APPROVED },
        select: ['createdAt', 'processedAt'],
      });

      let averageProcessingTimeHours = 0;
      if (approvedRequests.length > 0) {
        const totalProcessingTime = approvedRequests.reduce((sum, request) => {
          if (request.processedAt) {
            return sum + (request.processedAt.getTime() - request.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageProcessingTimeHours = totalProcessingTime / (approvedRequests.length * 1000 * 60 * 60);
      }

      return {
        totalInheritances,
        totalRequests,
        inheritancesByStatus,
        requestsByStatus,
        averageProcessingTimeHours: Math.round(averageProcessingTimeHours * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get inheritance statistics', error);
      throw error;
    }
  }

  private async triggerOracleVerification(request: InheritanceRequest): Promise<void> {
    try {
      // This would trigger the Chainlink oracle to verify the death certificate
      // For now, we'll just log it
      this.logger.log(`Triggering oracle verification for request: ${request.id}`);
      
      // In a real implementation, this would:
      // 1. Call the blockchain service to trigger oracle verification
      // 2. The oracle would verify the death certificate with external sources
      // 3. The oracle would call back with verification results
    } catch (error) {
      this.logger.error('Failed to trigger oracle verification', error);
    }
  }

  private mapToResponseDto(inheritance: Inheritance): InheritanceResponseDto {
    return {
      id: inheritance.id,
      landParcelId: inheritance.landParcelId,
      currentOwner: inheritance.currentOwner,
      designatedHeir: inheritance.designatedHeir,
      status: inheritance.status,
      conditions: inheritance.conditions,
      createdAt: inheritance.createdAt,
      completedAt: inheritance.completedAt,
      transferTxHash: inheritance.transferTxHash,
    };
  }

  private mapRequestToResponseDto(request: InheritanceRequest): InheritanceRequestResponseDto {
    return {
      id: request.id,
      inheritanceId: request.inheritanceId,
      requestedBy: request.requestedBy,
      status: request.status,
      deathCertificateHash: request.deathCertificateHash,
      createdAt: request.createdAt,
      processedAt: request.processedAt,
      processedBy: request.processedBy,
      verificationNotes: request.verificationNotes,
    };
  }
}