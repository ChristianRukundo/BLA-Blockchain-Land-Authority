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
      const landParcel = await this.laisService.findOne(createInheritanceDto.landParcelId);
      if (!landParcel) {
        throw new BadRequestException('Land parcel not found');
      }

      const inheritanceData = {
        parcelId: createInheritanceDto.landParcelId,
        ownerAddress: createInheritanceDto.currentOwner,
        designatedHeir: createInheritanceDto.designatedHeir,
        conditions: createInheritanceDto.conditions,
        createdAt: new Date().toISOString(),
      };

      const metadataHash = await this.ipfsService.uploadJson(inheritanceData);

      const inheritance = this.inheritanceRepository.create({
        parcelId: createInheritanceDto.landParcelId,
        ownerAddress: createInheritanceDto.currentOwner,
        designatedHeir: createInheritanceDto.designatedHeir,
        status: InheritanceStatus.ACTIVE,
        creationDate: new Date(),
        activationDate: new Date(),
        notes: createInheritanceDto.notes,
        creationTransactionHash: null,
      });

      const savedInheritance = await this.inheritanceRepository.save(inheritance);
      this.logger.log(`Inheritance created with ID: ${savedInheritance.id}`);

      await this.laisService.updateLandParcel(createInheritanceDto.landParcelId, {
        nominatedHeir: createInheritanceDto.designatedHeir,
      });

      await this.notificationService.createNotification({
        userId: createInheritanceDto.designatedHeir,
        type: NotificationType.INHERITANCE_DESIGNATED,
        title: 'You Have Been Designated as an Heir',
        content: `You have been designated as the heir for land parcel ${landParcel.upi}`,
        data: {
          inheritanceId: savedInheritance.id,
          parcelId: createInheritanceDto.landParcelId,
          ownerAddress: createInheritanceDto.currentOwner,
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
    ownerAddress?: string,
    designatedHeir?: string,
  ): Promise<InheritanceListResponseDto> {
    try {
      const where: FindOptionsWhere<Inheritance> = {};

      if (status) where.status = status;
      if (ownerAddress) where.ownerAddress = ownerAddress.toLowerCase();
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

  async findByLandParcel(parcelId: string): Promise<Inheritance | null> {
    try {
      return await this.inheritanceRepository.findOne({
        where: { parcelId, status: InheritanceStatus.ACTIVE },
      });
    } catch (error) {
      this.logger.error(`Failed to find inheritance for land parcel: ${parcelId}`, error);
      throw error;
    }
  }

  async update(id: string, updateInheritanceDto: UpdateInheritanceDto): Promise<Inheritance> {
    try {
      const inheritance = await this.findOne(id);

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

  async createInheritanceRequest(
    createRequestDto: CreateInheritanceRequestDto,
  ): Promise<InheritanceRequest> {
    try {
      const inheritance = await this.findByLandParcel(createRequestDto.parcelId);
      if (!inheritance) {
        throw new BadRequestException('No active inheritance found for this land parcel');
      }

      if (inheritance.status !== InheritanceStatus.ACTIVE) {
        throw new BadRequestException('Inheritance is not active');
      }

      if (inheritance.designatedHeir.toLowerCase() !== createRequestDto.requestedBy.toLowerCase()) {
        throw new BadRequestException('Only the designated heir can request inheritance');
      }

      const requestData = {
        inheritanceId: inheritance.id,
        requestedBy: createRequestDto.requestedBy,
        deathCertificateHash: createRequestDto.deathCertificateHash,
        supportingDocumentsHash: createRequestDto.supportingDocumentsHash,
        notes: createRequestDto.notes,
        createdAt: new Date().toISOString(),
      };

      const metadataHash = await this.ipfsService.uploadJson(requestData);

      const request = this.inheritanceRequestRepository.create({
        parcelId: createRequestDto.parcelId,
        ownerAddress: inheritance.ownerAddress,
        heirAddress: inheritance.designatedHeir,
        requestedBy: createRequestDto.requestedBy,
        inheritanceId: inheritance.id,
        status: RequestStatus.PENDING,
        requestDate: new Date(),
        documentsHash: createRequestDto.deathCertificateHash,
        notes: createRequestDto.notes,
      });

      const savedRequest = await this.inheritanceRequestRepository.save(request);
      this.logger.log(`Inheritance request created with ID: ${savedRequest.id}`);

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
      });

      if (!request) {
        throw new NotFoundException(`Inheritance request with ID ${requestId} not found`);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException('Request is not pending processing');
      }

      request.status = processDto.status;
      request.processedAt = new Date();
      request.processedBy = processDto.processedBy;
      request.verificationNotes = processDto.verificationNotes;
      request.oracleVerificationTxHash = processDto.transactionHash;

      if (processDto.status === RequestStatus.DEATH_VERIFIED) {
        await this.executeInheritanceRequest(request);
      }

      const updatedRequest = await this.inheritanceRequestRepository.save(request);
      this.logger.log(`Inheritance request processed: ${requestId} - ${request.status}`);

      const isApproved = processDto.status === RequestStatus.DEATH_VERIFIED;
      await this.notificationService.createNotification({
        userId: request.requestedBy,
        type: isApproved
          ? NotificationType.INHERITANCE_APPROVED
          : NotificationType.INHERITANCE_REJECTED,
        title: isApproved ? 'Inheritance Request Approved' : 'Inheritance Request Rejected',
        content: isApproved
          ? 'Your inheritance request has been approved and the land transfer is being processed'
          : `Your inheritance request has been rejected: ${processDto.verificationNotes}`,
        data: {
          requestId,
          inheritanceId: request.inheritanceId,
          status: processDto.status,
          notes: processDto.verificationNotes,
        },
      });

      return updatedRequest;
    } catch (error) {
      this.logger.error(`Failed to process inheritance request with ID: ${requestId}`, error);
      throw error;
    }
  }

  async executeInheritanceRequest(request: InheritanceRequest): Promise<void> {
    try {
      const inheritance = await this.findOne(request.inheritanceId);

      const txResponse = await this.blockchainService.executeInheritanceRequest(
        inheritance.parcelId,
      );

      inheritance.status = InheritanceStatus.COMPLETED;
      inheritance.completionDate = new Date();
      inheritance.completionTransactionHash = txResponse.hash;
      await this.inheritanceRepository.save(inheritance);

      await this.laisService.updateLandParcel(inheritance.parcelId, {
        ownerAddress: inheritance.designatedHeir,
        nominatedHeir: null,
      });

      this.logger.log(`Inheritance transfer executed: ${inheritance.id} - TX: ${txResponse.hash}`);
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
      inheritance.cancellationDate = new Date();
      inheritance.cancellationReason = reason;

      const updatedInheritance = await this.inheritanceRepository.save(inheritance);
      this.logger.log(`Inheritance cancelled by ${cancelledBy}: ${id}`);

      await this.laisService.updateLandParcel(inheritance.parcelId, {
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
        averageProcessingTimeHours =
          totalProcessingTime / (approvedRequests.length * 1000 * 60 * 60);
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
      this.logger.log(`Triggering oracle verification for request: ${request.id}`);
    } catch (error) {
      this.logger.error('Failed to trigger oracle verification', error);
    }
  }

  private mapToResponseDto(inheritance: Inheritance): InheritanceResponseDto {
    return {
      id: inheritance.id,
      landParcelId: inheritance.parcelId,
      currentOwner: inheritance.ownerAddress,
      designatedHeir: inheritance.designatedHeir,
      status: inheritance.status,
      createdAt: inheritance.createdAt,
      completedAt: inheritance.completionDate,
      transferTxHash: inheritance.completionTransactionHash,
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
