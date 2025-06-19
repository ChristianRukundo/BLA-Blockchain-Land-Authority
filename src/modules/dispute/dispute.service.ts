import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeEvidence, DisputeStatus, DisputeRuling } from './entities/dispute.entity';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeFilterDto,
  SubmitEvidenceDto,
  SubmitToKlerosDto,
  ExecuteRulingDto,
  AppealDisputeDto,
} from './dto/dispute.dto';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { LaisService } from '../lais/lais.service';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private evidenceRepository: Repository<DisputeEvidence>,
    private ipfsService: IpfsService,
    private notificationService: NotificationService,
    private laisService: LaisService,
  ) {}

  async createDispute(dto: CreateDisputeDto): Promise<Dispute> {
    // Verify parcel exists
    const parcel = await this.laisService.findOne(dto.parcelId);
    if (!parcel) {
      throw new NotFoundException(`Land parcel with ID ${dto.parcelId} not found`);
    }

    // Check if there's already an active dispute for this parcel
    const existingDispute = await this.disputeRepository.findOne({
      where: {
        parcelId: dto.parcelId,
        status: DisputeStatus.CREATED,
      },
    });

    if (existingDispute) {
      throw new BadRequestException('There is already an active dispute for this parcel');
    }

    // Create dispute
    const dispute = this.disputeRepository.create({
      ...dto,
      createdDate: new Date(dto.createdDate),
      status: DisputeStatus.CREATED,
    });

    // Save dispute
    const savedDispute = await this.disputeRepository.save(dispute);

    // Update parcel dispute status
    await this.laisService.updateDisputeStatus(dto.parcelId, true);

    // Send notifications
    await this.notificationService.notifyDisputeCreated(savedDispute);

    return this.findOne(savedDispute.id);
  }

  async findAll(filters: DisputeFilterDto): Promise<PaginatedResult<Dispute>> {
    const query = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.parcel', 'parcel');

    // Apply filters
    if (filters.parcelId) {
      query.andWhere('dispute.parcelId = :parcelId', { parcelId: filters.parcelId });
    }

    if (filters.disputeType) {
      query.andWhere('dispute.disputeType = :disputeType', { disputeType: filters.disputeType });
    }

    if (filters.status) {
      query.andWhere('dispute.status = :status', { status: filters.status });
    }

    if (filters.plaintiffAddress) {
      query.andWhere('dispute.plaintiffAddress = :plaintiffAddress', { 
        plaintiffAddress: filters.plaintiffAddress 
      });
    }

    if (filters.defendantAddress) {
      query.andWhere('dispute.defendantAddress = :defendantAddress', { 
        defendantAddress: filters.defendantAddress 
      });
    }

    if (filters.ruling) {
      query.andWhere('dispute.ruling = :ruling', { ruling: filters.ruling });
    }

    if (filters.createdDateFrom) {
      query.andWhere('dispute.createdDate >= :from', { from: filters.createdDateFrom });
    }

    if (filters.createdDateTo) {
      query.andWhere('dispute.createdDate <= :to', { to: filters.createdDateTo });
    }

    if (filters.activeOnly) {
      query.andWhere('dispute.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [DisputeStatus.RESOLVED, DisputeStatus.CANCELLED],
      });
    }

    // Add sorting
    query.orderBy(`dispute.${filters.sortBy}`, filters.sortOrder);

    // Add pagination
    const skip = (filters.page - 1) * filters.limit;
    query.skip(skip).take(filters.limit);

    // Execute query
    const [disputes, total] = await query.getManyAndCount();

    return {
      data: disputes,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['parcel'],
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${id} not found`);
    }

    return dispute;
  }

  async findByParcel(parcelId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { parcelId },
      relations: ['parcel'],
      order: { createdDate: 'DESC' },
    });
  }

  async findByUser(userAddress: string): Promise<Dispute[]> {
    return this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.parcel', 'parcel')
      .where('dispute.plaintiffAddress = :address OR dispute.defendantAddress = :address', {
        address: userAddress,
      })
      .orderBy('dispute.createdDate', 'DESC')
      .getMany();
  }

  async update(id: string, dto: UpdateDisputeDto): Promise<Dispute> {
    const dispute = await this.findOne(id);

    // Update dispute
    Object.assign(dispute, {
      ...dto,
      rulingDate: dto.rulingDate ? new Date(dto.rulingDate) : dispute.rulingDate,
      appealDeadline: dto.appealDeadline ? new Date(dto.appealDeadline) : dispute.appealDeadline,
    });

    const updatedDispute = await this.disputeRepository.save(dispute);

    // Send notifications for status changes
    if (dto.status && dto.status !== dispute.status) {
      await this.notificationService.notifyDisputeStatusUpdate(updatedDispute);
    }

    return this.findOne(updatedDispute.id);
  }

  async submitEvidence(
    disputeId: string,
    submitterAddress: string,
    dto: SubmitEvidenceDto,
  ): Promise<DisputeEvidence> {
    const dispute = await this.findOne(disputeId);

    if (!dispute.canSubmitEvidence) {
      throw new BadRequestException('Evidence submission is not allowed for this dispute');
    }

    // Verify submitter is involved in the dispute
    if (
      submitterAddress.toLowerCase() !== dispute.plaintiffAddress.toLowerCase() &&
      submitterAddress.toLowerCase() !== dispute.defendantAddress.toLowerCase()
    ) {
      throw new BadRequestException('Only dispute parties can submit evidence');
    }

    // Create evidence record
    const evidence = this.evidenceRepository.create({
      ...dto,
      disputeId,
      submitterAddress,
      submittedDate: new Date(),
    });

    const savedEvidence = await this.evidenceRepository.save(evidence);

    // Send notifications
    await this.notificationService.notifyEvidenceSubmitted(dispute, savedEvidence);

    return savedEvidence;
  }

  async getEvidence(disputeId: string): Promise<DisputeEvidence[]> {
    return this.evidenceRepository.find({
      where: { disputeId },
      order: { submittedDate: 'ASC' },
    });
  }

  async submitToKleros(id: string, dto: SubmitToKlerosDto): Promise<Dispute> {
    const dispute = await this.findOne(id);

    if (dispute.status !== DisputeStatus.EVIDENCE_SUBMISSION) {
      throw new BadRequestException('Dispute is not ready for Kleros submission');
    }

    // In a real implementation, this would interact with Kleros smart contracts
    // For now, we'll simulate the process
    const klerosDisputeId = `kleros_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const updatedDispute = await this.update(id, {
      status: DisputeStatus.KLEROS_SUBMITTED,
      klerosDisputeId,
      klerosCourtId: dto.klerosCourtId,
      numberOfJurors: dto.numberOfJurors,
      arbitrationFee: dto.arbitrationFee,
      klerosMetadata: dto.metadata,
    });

    // Send notifications
    await this.notificationService.notifyDisputeSubmittedToKleros(updatedDispute);

    return updatedDispute;
  }

  async executeRuling(id: string, dto: ExecuteRulingDto): Promise<Dispute> {
    const dispute = await this.findOne(id);

    if (!dispute.canExecuteRuling) {
      throw new BadRequestException('Ruling cannot be executed for this dispute');
    }

    // Update dispute with execution details
    const updatedDispute = await this.update(id, {
      status: DisputeStatus.RULING_EXECUTED,
      executionTransactionHash: dto.executionTransactionHash,
      resolvedDate: new Date().toISOString(),
      notes: dto.notes,
    });

    // Update parcel dispute status
    await this.laisService.updateDisputeStatus(dispute.parcelId, false);

    // Send notifications
    await this.notificationService.notifyDisputeResolved(updatedDispute);

    return updatedDispute;
  }

  async appealDispute(id: string, appealerAddress: string, dto: AppealDisputeDto): Promise<Dispute> {
    const dispute = await this.findOne(id);

    if (!dispute.canBeAppealed) {
      throw new BadRequestException('This dispute cannot be appealed');
    }

    // Verify appealer is involved in the dispute
    if (
      appealerAddress.toLowerCase() !== dispute.plaintiffAddress.toLowerCase() &&
      appealerAddress.toLowerCase() !== dispute.defendantAddress.toLowerCase()
    ) {
      throw new BadRequestException('Only dispute parties can appeal');
    }

    // In a real implementation, this would interact with Kleros for appeals
    const updatedDispute = await this.update(id, {
      status: DisputeStatus.JURY_SELECTION, // Reset to jury selection for appeal
      appealCount: dispute.appealCount + 1,
      notes: `${dispute.notes || ''}\nAppeal: ${dto.appealReason}`,
    });

    // Send notifications
    await this.notificationService.notifyDisputeAppealed(updatedDispute);

    return updatedDispute;
  }

  async cancelDispute(id: string, reason: string): Promise<Dispute> {
    const dispute = await this.findOne(id);

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CANCELLED) {
      throw new BadRequestException('Dispute is already resolved or cancelled');
    }

    const updatedDispute = await this.update(id, {
      status: DisputeStatus.CANCELLED,
      resolvedDate: new Date().toISOString(),
      notes: `${dispute.notes || ''}\nCancelled: ${reason}`,
    });

    // Update parcel dispute status
    await this.laisService.updateDisputeStatus(dispute.parcelId, false);

    // Send notifications
    await this.notificationService.notifyDisputeCancelled(updatedDispute);

    return updatedDispute;
  }

  async getDisputeStatistics(): Promise<any> {
    const [
      totalDisputes,
      activeDisputes,
      resolvedDisputes,
      cancelledDisputes,
      inKlerosDisputes,
    ] = await Promise.all([
      this.disputeRepository.count(),
      this.disputeRepository.count({
        where: {
          status: DisputeStatus.CREATED,
        },
      }),
      this.disputeRepository.count({
        where: {
          status: DisputeStatus.RESOLVED,
        },
      }),
      this.disputeRepository.count({
        where: {
          status: DisputeStatus.CANCELLED,
        },
      }),
      this.disputeRepository.count({
        where: {
          status: DisputeStatus.KLEROS_SUBMITTED,
        },
      }),
    ]);

    // Calculate average resolution time
    const resolvedDisputesWithDates = await this.disputeRepository
      .createQueryBuilder('dispute')
      .select(['dispute.createdDate', 'dispute.resolvedDate'])
      .where('dispute.status = :status', { status: DisputeStatus.RESOLVED })
      .andWhere('dispute.resolvedDate IS NOT NULL')
      .getMany();

    let averageResolutionDays = 0;
    if (resolvedDisputesWithDates.length > 0) {
      const totalDays = resolvedDisputesWithDates.reduce((sum, dispute) => {
        const diffTime = Math.abs(
          new Date(dispute.resolvedDate).getTime() - new Date(dispute.createdDate).getTime()
        );
        return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }, 0);
      averageResolutionDays = Math.round(totalDays / resolvedDisputesWithDates.length);
    }

    return {
      totalDisputes,
      activeDisputes,
      resolvedDisputes,
      cancelledDisputes,
      inKlerosDisputes,
      averageResolutionDays,
      resolutionRate: totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0,
    };
  }

  async getActiveDisputes(): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: {
        status: DisputeStatus.CREATED,
      },
      relations: ['parcel'],
      order: { createdDate: 'DESC' },
    });
  }

  // Kleros webhook handler (simulated)
  async handleKlerosUpdate(klerosDisputeId: string, updateData: any): Promise<void> {
    const dispute = await this.disputeRepository.findOne({
      where: { klerosDisputeId },
    });

    if (!dispute) {
      console.warn(`Dispute not found for Kleros ID: ${klerosDisputeId}`);
      return;
    }

    // Update dispute based on Kleros data
    const updates: Partial<UpdateDisputeDto> = {
      klerosMetadata: updateData,
    };

    // Map Kleros status to our status
    if (updateData.status === 'jury_selected') {
      updates.status = DisputeStatus.JURY_SELECTION;
    } else if (updateData.status === 'voting') {
      updates.status = DisputeStatus.VOTING_PERIOD;
    } else if (updateData.status === 'appeal_period') {
      updates.status = DisputeStatus.APPEAL_PERIOD;
      updates.appealDeadline = new Date(updateData.appealDeadline).toISOString();
    } else if (updateData.status === 'ruled') {
      updates.ruling = this.mapKlerosRuling(updateData.ruling);
      updates.rulingDetails = updateData.rulingDetails;
      updates.rulingDate = new Date(updateData.rulingDate).toISOString();
    }

    await this.update(dispute.id, updates);
  }

  private mapKlerosRuling(klerosRuling: number): DisputeRuling {
    switch (klerosRuling) {
      case 1:
        return DisputeRuling.PLAINTIFF_WINS;
      case 2:
        return DisputeRuling.DEFENDANT_WINS;
      case 3:
        return DisputeRuling.SETTLEMENT;
      default:
        return DisputeRuling.DISMISSED;
    }
  }
}

