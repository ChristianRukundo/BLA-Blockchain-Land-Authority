import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, Not, IsNull } from 'typeorm';
import {
  Dispute,
  DisputeEvidence,
  DisputeStatus,
  DisputeRuling,
  DisputePartyType,
  DisputeType,
} from './entities/dispute.entity';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeFilterDto,
  SubmitEvidenceDto,
  SubmitToArbitrationDto, // Corrected DTO name
  RecordRulingDto, // Corrected DTO name
  ExecuteConsequencesDto, // Added this for clarity
  AppealDisputeDto,
} from './dto/dispute.dto'; // Ensure this path is correct
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/dto/notification.dto';
import { LaisService } from '../lais/lais.service'; // UpdateLandParcelDto will be used implicitly if LaisService has it
import { PaginatedResult } from '../../shared/paginated-result.interface';
import { NotificationType } from '../notification/enums/notification.enum';
import { LandParcel } from '../lais/entities/land-parcel.entity';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private readonly evidenceRepository: Repository<DisputeEvidence>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly laisService: LaisService,
  ) {}

  async createDispute(dto: CreateDisputeDto, creatorAddress: string): Promise<Dispute> {
    this.logger.log(
      `Creating dispute for parcel ID ${dto.parcelId} by plaintiff ${dto.plaintiffAddress}. Initiator: ${creatorAddress}`,
    );
    const parcel: LandParcel | null = await this.laisService.getLandParcelById(dto.parcelId);
    if (!parcel) {
      throw new NotFoundException(`Land parcel with ID ${dto.parcelId} not found.`);
    }

    if (dto.plaintiffAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      this.logger.warn(
        `Dispute creation initiated by ${creatorAddress}, but plaintiff is listed as ${dto.plaintiffAddress}. Ensure proper authorization if these differ.`,
      );
      // Consider: throw new ForbiddenException('Plaintiff address must match the authenticated user creating the dispute.');
    }

    const activeStatuses = [
      DisputeStatus.CREATED,
      DisputeStatus.EVIDENCE_SUBMISSION,
      DisputeStatus.PENDING_ARBITRATION,
      DisputeStatus.UNDER_ARBITRATION,
      DisputeStatus.AWAITING_RULING,
      DisputeStatus.RULING_GIVEN,
      DisputeStatus.APPEAL_PERIOD,
      DisputeStatus.UNDER_APPEAL,
    ];
    const existingDispute = await this.disputeRepository.findOne({
      where: { parcelId: dto.parcelId, status: In(activeStatuses) },
    });
    if (existingDispute) {
      throw new BadRequestException(
        `Parcel ID ${dto.parcelId} already has an ongoing dispute (ID: ${existingDispute.id}, Status: ${existingDispute.status}).`,
      );
    }

    const disputeEntity = this.disputeRepository.create({
      parcelId: dto.parcelId,
      disputeType: dto.disputeType,
      plaintiffAddress: dto.plaintiffAddress.toLowerCase(),
      defendantAddress: dto.defendantAddress.toLowerCase(),
      involvedParties: dto.involvedParties?.map(addr => addr.toLowerCase()),
      title: dto.title,
      description: dto.description,
      evidenceSubmissionDeadline: dto.evidenceSubmissionDeadline
        ? new Date(dto.evidenceSubmissionDeadline)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: DisputeStatus.CREATED,
      notes: dto.notes,
      metadata: dto.metadata,
    });
    const savedDispute = await this.disputeRepository.save(disputeEntity);
    this.logger.log(`Dispute created with DB ID: ${savedDispute.id}`);

    if (dto.initialEvidence) {
      this.logger.log(`Submitting initial evidence for dispute ${savedDispute.id}`);
      await this.submitEvidence(savedDispute.id, dto.plaintiffAddress, dto.initialEvidence);
    }

    await this.laisService.updateDisputeStatus(dto.parcelId, true);

    const notificationDto: CreateNotificationDto = {
      userId: dto.defendantAddress,
      type: NotificationType.DISPUTE_RAISED,
      title: `New Dispute: ${savedDispute.title}`,
      content: `A new dispute regarding parcel UPI ${parcel.upi || dto.parcelId} has been initiated by ${dto.plaintiffAddress}.`,
      data: { disputeId: savedDispute.id, parcelId: dto.parcelId, parcelUpi: parcel.upi },
    };
    await this.notificationService.createNotification(notificationDto);
    await this.notificationService.createNotification({
      ...notificationDto,
      userId: dto.plaintiffAddress,
      content: `Your dispute "${savedDispute.title}" regarding parcel UPI ${parcel.upi || dto.parcelId} has been successfully created.`,
    });

    return this.findOne(savedDispute.id);
  }

  async findAll(filters: DisputeFilterDto): Promise<PaginatedResult<Dispute>> {
    this.logger.debug(`Finding all disputes with filters: ${JSON.stringify(filters)}`);
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdDate',
      sortOrder = 'DESC',
      activeOnly,
      ...otherFilters
    } = filters;

    const query = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.parcel', 'parcel')
      .leftJoinAndSelect('dispute.evidenceEntries', 'evidence');

    if (otherFilters.parcelId)
      query.andWhere('dispute.parcelId = :parcelId', { parcelId: otherFilters.parcelId });
    if (otherFilters.disputeType)
      query.andWhere('dispute.disputeType = :disputeType', {
        disputeType: otherFilters.disputeType,
      });
    if (otherFilters.status)
      query.andWhere('dispute.status = :status', { status: otherFilters.status });
    if (otherFilters.plaintiffAddress)
      query.andWhere('LOWER(dispute.plaintiffAddress) = LOWER(:plaintiffAddress)', {
        plaintiffAddress: otherFilters.plaintiffAddress.toLowerCase(),
      });
    if (otherFilters.defendantAddress)
      query.andWhere('LOWER(dispute.defendantAddress) = LOWER(:defendantAddress)', {
        defendantAddress: otherFilters.defendantAddress.toLowerCase(),
      });
    if (otherFilters.ruling)
      query.andWhere('dispute.ruling = :ruling', { ruling: otherFilters.ruling });
    if (otherFilters.createdDateFrom)
      query.andWhere('dispute.createdDate >= :from', {
        from: new Date(otherFilters.createdDateFrom),
      });
    if (otherFilters.createdDateTo)
      query.andWhere('dispute.createdDate <= :to', { to: new Date(otherFilters.createdDateTo) });

    if (activeOnly === true) {
      query.andWhere('dispute.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [
          DisputeStatus.RESOLVED,
          DisputeStatus.CANCELLED,
          DisputeStatus.RULING_EXECUTED,
          DisputeStatus.SETTLED,
          DisputeStatus.FAILED_ARBITRATION,
        ],
      });
    }

    const validSortFields = [
      'id',
      'title',
      'createdDate',
      'status',
      'disputeType',
      'parcelId',
      'updatedAt',
      'rulingDate',
      'resolvedDate',
    ];
    if (!validSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sortBy field: ${sortBy}. Valid fields are: ${validSortFields.join(', ')}`,
      );
    }
    query.orderBy(`dispute.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Dispute> {
    this.logger.debug(`Finding dispute by ID: ${id}`);
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['parcel', 'evidenceEntries'],
    });
    if (!dispute) throw new NotFoundException(`Dispute with ID "${id}" not found.`);
    return dispute;
  }

  async findByParcelId(parcelId: string): Promise<Dispute[]> {
    this.logger.debug(`Finding disputes for parcel ID: ${parcelId}`);
    return this.disputeRepository.find({
      where: { parcelId },
      relations: ['parcel', 'evidenceEntries'],
      order: { createdDate: 'DESC' },
    });
  }

  async findByUserAddress(userAddress: string): Promise<Dispute[]> {
    this.logger.debug(`Finding disputes involving user: ${userAddress}`);
    const addressLower = userAddress.toLowerCase();
    return this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.parcel', 'parcel')
      .leftJoinAndSelect('dispute.evidenceEntries', 'evidence')
      .where('LOWER(dispute.plaintiffAddress) = :address', { address: addressLower })
      .orWhere('LOWER(dispute.defendantAddress) = :address', { address: addressLower })
      .orWhere("array_to_string(dispute.involvedParties, ',') ILIKE :involvedAddress", {
        involvedAddress: `%${addressLower}%`,
      }) // More robust for simple-array
      .orderBy('dispute.createdDate', 'DESC')
      .getMany();
  }

  async updateDispute(
    id: string,
    dto: UpdateDisputeDto,
    updaterAddress?: string,
  ): Promise<Dispute> {
    this.logger.log(`Updating dispute ID ${id} by ${updaterAddress || 'system'}`);
    const dispute = await this.findOne(id);
    const oldStatus = dispute.status;

    const updatePayload: Partial<Dispute> = {};
    (Object.keys(dto) as Array<keyof UpdateDisputeDto>).forEach(key => {
      if (dto[key] !== undefined) {
        if (key === 'rulingDate' && dto.rulingDate)
          updatePayload.rulingDate = new Date(dto.rulingDate);
        else if (key === 'appealDeadline' && dto.appealDeadline)
          updatePayload.appealDeadline = new Date(dto.appealDeadline);
        else if (key === 'resolvedDate' && dto.resolvedDate)
          updatePayload.resolvedDate = new Date(dto.resolvedDate);
        else if (key === 'escalationDate' && dto.escalationDate)
          updatePayload.escalationDate = new Date(dto.escalationDate);
        else (updatePayload as any)[key] = dto[key];
      }
    });
    if (dto.notes) {
      updatePayload.notes = dispute.notes
        ? `${dispute.notes}\nUpdate by ${updaterAddress || 'system'}: ${dto.notes}`
        : `Update by ${updaterAddress || 'system'}: ${dto.notes}`;
    }

    this.disputeRepository.merge(dispute, updatePayload);
    const updatedDispute = await this.disputeRepository.save(dispute);

    if (dto.status && dto.status !== oldStatus) {
      const parcel =
        dispute.parcel || (await this.laisService.getLandParcelById(updatedDispute.parcelId));
      const notificationDto: CreateNotificationDto = {
        userId: updatedDispute.plaintiffAddress,
        type: NotificationType.DISPUTE_STATUS_UPDATED,
        title: `Dispute Status Updated: ${updatedDispute.title}`,
        content: `The status of your dispute regarding parcel ${parcel?.upi || updatedDispute.parcelId} has changed from ${oldStatus} to ${updatedDispute.status}.`,
        data: { disputeId: updatedDispute.id, newStatus: updatedDispute.status, oldStatus },
      };
      await this.notificationService.createNotification(notificationDto);
      await this.notificationService.createNotification({
        ...notificationDto,
        userId: updatedDispute.defendantAddress,
      });
    }
    return this.findOne(updatedDispute.id);
  }

  async submitEvidence(
    disputeId: string,
    submitterAddress: string,
    dto: SubmitEvidenceDto,
  ): Promise<DisputeEvidence> {
    this.logger.log(`Submitting evidence for dispute ID ${disputeId} by ${submitterAddress}`);
    const dispute = await this.findOne(disputeId);

    if (!dispute.canSubmitEvidence) {
      throw new BadRequestException(
        `Evidence submission period for dispute ID ${disputeId} has passed or status (${dispute.status}) is not eligible.`,
      );
    }

    const submitterAddrLower = submitterAddress.toLowerCase();
    let roleInDispute = dto.submitterRole;
    if (!roleInDispute) {
      if (dispute.plaintiffAddress.toLowerCase() === submitterAddrLower)
        roleInDispute = DisputePartyType.PLAINTIFF;
      else if (dispute.defendantAddress.toLowerCase() === submitterAddrLower)
        roleInDispute = DisputePartyType.DEFENDANT;
      else if (dispute.involvedParties?.map(p => p.toLowerCase()).includes(submitterAddrLower))
        roleInDispute = DisputePartyType.INTERVENOR;
      else
        throw new ForbiddenException(
          'Submitter is not a recognized party to this dispute for submitting evidence.',
        );
    }

    const evidenceEntity = this.evidenceRepository.create({
      disputeId,
      submitterAddress: submitterAddrLower,
      submitterRole: roleInDispute,
      title: dto.title,
      description: dto.description,
      evidenceHashOrUrl: dto.evidenceHashOrUrl,
      fileType: dto.fileType,
      fileSize: dto.fileSize?.toString(),
      metadata: dto.metadata,
    });
    const savedEvidence = await this.evidenceRepository.save(evidenceEntity);
    this.logger.log(`Evidence ID ${savedEvidence.id} submitted for dispute ID ${disputeId}`);

    if (dispute.status === DisputeStatus.CREATED) {
      await this.updateDispute(
        disputeId,
        { status: DisputeStatus.EVIDENCE_SUBMISSION },
        'SystemTransition',
      );
    }

    const otherParty =
      submitterAddrLower === dispute.plaintiffAddress.toLowerCase()
        ? dispute.defendantAddress
        : dispute.plaintiffAddress;
    const notificationDto: CreateNotificationDto = {
      userId: otherParty,
      type: NotificationType.DISPUTE_EVIDENCE_SUBMITTED,
      title: `New Evidence on Dispute: ${dispute.title}`,
      content: `${submitterAddress} (as ${roleInDispute}) submitted new evidence titled "${savedEvidence.title}" for dispute ${disputeId}.`,
      data: { disputeId, evidenceId: savedEvidence.id },
    };
    await this.notificationService.createNotification(notificationDto);

    return savedEvidence;
  }

  async getEvidenceForDispute(disputeId: string): Promise<DisputeEvidence[]> {
    this.logger.debug(`Fetching evidence for dispute ID: ${disputeId}`);
    await this.findOne(disputeId);
    return this.evidenceRepository.find({
      where: { disputeId },
      order: { submittedDate: 'ASC' },
    });
  }

  async submitToArbitration(
    id: string,
    dto: SubmitToArbitrationDto,
    submitterAddress: string,
  ): Promise<Dispute> {
    this.logger.log(`Submitting dispute ID ${id} to arbitration by ${submitterAddress}`);
    const dispute = await this.findOne(id);

    if (!dispute.canEscalateToArbitration) {
      throw new BadRequestException(
        `Dispute ID ${id} cannot be submitted to arbitration (current status: ${dispute.status}).`,
      );
    }



    const externalDisputeId = `SIM_KLEROS_${Date.now()}`; // Simulated
    this.logger.log(`Simulated submission to arbitration. External ID: ${externalDisputeId}`);

    const updatePayload: UpdateDisputeDto = {
      status: DisputeStatus.PENDING_ARBITRATION,
      externalDisputeId: externalDisputeId,
      arbitrationCourtId: dto.arbitrationPlatformCourtId,
      numberOfArbitrators: dto.numberOfArbitrators,
      arbitrationFeePaid: dto.arbitrationFeePaid,
      metadata: {
        ...(dispute.metadata || {}),
        arbitrationSubmission: dto.metadata,
        submittedBy: submitterAddress,
      },
      escalationDate: new Date().toISOString(),
      notes: `${dispute.notes || ''}\nSubmitted to arbitration by ${submitterAddress}. External ID: ${externalDisputeId}`,
    };
    const updatedDispute = await this.updateDispute(id, updatePayload, submitterAddress);

    // Notify parties
    // ...
    return updatedDispute;
  }

  async recordRuling(id: string, dto: RecordRulingDto, processorAddress: string): Promise<Dispute> {
    this.logger.log(`Recording ruling for dispute ID ${id} by ${processorAddress}`);
    const dispute = await this.findOne(id);

    if (
      ![
        DisputeStatus.UNDER_ARBITRATION,
        DisputeStatus.AWAITING_RULING,
        DisputeStatus.APPEAL_PERIOD,
        DisputeStatus.UNDER_APPEAL,
        DisputeStatus.PENDING_ARBITRATION,
      ].includes(dispute.status)
    ) {
      throw new BadRequestException(
        `Dispute ID ${id} is not in a state where a ruling can be recorded (current: ${dispute.status}).`,
      );
    }

    const updatePayload: UpdateDisputeDto = {
      status: DisputeStatus.RULING_GIVEN,
      ruling: dto.ruling,
      rulingDate: dto.rulingDate
        ? new Date(dto.rulingDate).toISOString()
        : new Date().toISOString(),
      rulingDetails: dto.rulingDetails,
      appealDeadline: dto.appealDeadline ? new Date(dto.appealDeadline).toISOString() : undefined,
      notes: `${dispute.notes || ''}\nRuling recorded by ${processorAddress}. Ruling: ${dto.ruling}. Details: ${dto.rulingDetails || ''}`,
      metadata: { ...(dispute.metadata || {}), rulingTx: dto.externalRulingTxHash },
    };
    const updatedDispute = await this.updateDispute(id, updatePayload, processorAddress);

    // Notify parties
    // ... (send notification about the ruling)
    return updatedDispute;
  }

  async applyRulingConsequences(
    id: string,
    dto: ExecuteConsequencesDto,
    executorAddress: string,
  ): Promise<Dispute> {
    this.logger.log(`Applying ruling consequences for dispute ID ${id} by ${executorAddress}`);
    const dispute = await this.findOne(id);

    if (!dispute.canExecuteRuling) {
      throw new BadRequestException(
        `Ruling for dispute ID ${id} cannot be executed at this time (Status: ${dispute.status}, Ruling: ${dispute.ruling}, Appeal Deadline: ${dispute.appealDeadline}).`,
      );
    }

    // TODO: Implement actual on-chain/off-chain consequences based on dispute.ruling
    this.logger.log(
      `Simulating application of consequences for ruling ${dispute.ruling} on dispute ${id}.`,
    );

    const updatePayload: UpdateDisputeDto = {
      status: DisputeStatus.RULING_EXECUTED,
      executionTransactionHash: dto.executionTransactionHash,
      resolvedDate: new Date().toISOString(),
      notes: `${dispute.notes || ''}\nRuling consequences applied by ${executorAddress}. Notes: ${dto.notes || ''}`,
    };
    const updatedDispute = await this.updateDispute(id, updatePayload, executorAddress);

    await this.laisService.updateDisputeStatus(dispute.parcelId, false);

    // Notify parties
    // ...
    return updatedDispute;
  }

  async appealDispute(
    id: string,
    appealerAddress: string,
    dto: AppealDisputeDto,
  ): Promise<Dispute> {
    this.logger.log(`Appealing dispute ID ${id} by ${appealerAddress}`);
    const dispute = await this.findOne(id);

    if (!dispute.canAppeal) {
      throw new BadRequestException(
        `Dispute ID ${id} cannot be appealed at this time (status: ${dispute.status}, appeal deadline: ${dispute.appealDeadline}, appeal count: ${dispute.appealCount}).`,
      );
    }
    const appealerAddrLower = appealerAddress.toLowerCase();
    if (
      dispute.plaintiffAddress.toLowerCase() !== appealerAddrLower &&
      dispute.defendantAddress.toLowerCase() !== appealerAddrLower
    ) {
      throw new ForbiddenException('Only the plaintiff or defendant can appeal the dispute.');
    }

    // TODO: On-chain interaction for appeal via BlockchainService if applicable
    this.logger.log(`Simulated appeal process for dispute ID ${id}.`);

    const updatePayload: UpdateDisputeDto = {
      status: DisputeStatus.UNDER_APPEAL,
      appealCount: (dispute.appealCount || 0) + 1,
      appealFeePaid: dto.appealFeePaid,
      notes: `${dispute.notes || ''}\nAppeal #${(dispute.appealCount || 0) + 1} by ${appealerAddress}. Reason: ${dto.appealReason}. Evidence: ${dto.additionalEvidenceHashOrUrl || 'N/A'}`,
      appealDeadline: undefined, // This would be set by the arbitration platform for the new appeal round
      metadata: {
        ...(dispute.metadata || {}),
        appealInfo: {
          reason: dto.appealReason,
          evidence: dto.additionalEvidenceHashOrUrl,
          fee: dto.appealFeePaid,
        },
      },
    };
    return this.updateDispute(id, updatePayload, appealerAddress);
  }

  async cancelDispute(id: string, reason: string, cancellerAddress: string): Promise<Dispute> {
    this.logger.log(`Cancelling dispute ID ${id} by ${cancellerAddress}. Reason: ${reason}`);
    const dispute = await this.findOne(id);
    if (
      [
        DisputeStatus.RESOLVED,
        DisputeStatus.CANCELLED,
        DisputeStatus.RULING_EXECUTED,
        DisputeStatus.SETTLED,
      ].includes(dispute.status)
    ) {
      throw new BadRequestException('Dispute is already concluded.');
    }

    const updatePayload: UpdateDisputeDto = {
      status: DisputeStatus.CANCELLED,
      cancellationReason: reason,
      resolvedDate: new Date().toISOString(),
      notes: `${dispute.notes || ''}\nCancelled by ${cancellerAddress}. Reason: ${reason}`,
    };
    const updatedDispute = await this.updateDispute(id, updatePayload, cancellerAddress);
    await this.laisService.updateDisputeStatus(dispute.parcelId, false);
    return updatedDispute;
  }

  async getDisputeStatistics(): Promise<any> {
    this.logger.debug('Fetching dispute statistics.');
    const [
      totalDisputes,
      createdCount,
      evidenceSubmissionCount,
      pendingArbitrationCount,
      underArbitrationCount,
      awaitingRulingCount,
      rulingGivenCount,
      appealPeriodCount,
      underAppealCount,
      rulingExecutedCount,
      settledCount,
      // resolvedCount will be sum of rulingExecutedCount and settledCount
      cancelledCountVal, // Renamed to avoid conflict
      failedArbitrationCount,
    ] = await Promise.all([
      this.disputeRepository.count(),
      this.disputeRepository.count({ where: { status: DisputeStatus.CREATED } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.EVIDENCE_SUBMISSION } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.PENDING_ARBITRATION } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.UNDER_ARBITRATION } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.AWAITING_RULING } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.RULING_GIVEN } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.APPEAL_PERIOD } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.UNDER_APPEAL } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.RULING_EXECUTED } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.SETTLED } }),
      // For resolvedCount, we sum specific terminal states
      this.disputeRepository.count({ where: { status: DisputeStatus.CANCELLED } }),
      this.disputeRepository.count({ where: { status: DisputeStatus.FAILED_ARBITRATION } }),
    ]);

    const resolvedCount = rulingExecutedCount + settledCount; // Definition of resolved
    const activeDisputes =
      totalDisputes - (resolvedCount + cancelledCountVal + failedArbitrationCount);

    const resolvedDisputesWithDates = await this.disputeRepository.find({
      where: {
        status: In([DisputeStatus.RULING_EXECUTED, DisputeStatus.SETTLED]),
        resolvedDate: Not(IsNull()),
      },
      select: ['createdDate', 'resolvedDate'],
    });
    let averageResolutionDays = 0;
    if (resolvedDisputesWithDates.length > 0) {
      const totalProcessingTimeMs = resolvedDisputesWithDates.reduce((sum, d) => {
        // Ensure dates are valid before getTime()
        const resolvedTime = d.resolvedDate ? new Date(d.resolvedDate).getTime() : 0;
        const createdTime = d.createdDate ? new Date(d.createdDate).getTime() : 0;
        return sum + (resolvedTime - createdTime);
      }, 0);
      averageResolutionDays = Math.round(
        totalProcessingTimeMs / (resolvedDisputesWithDates.length * 24 * 60 * 60 * 1000),
      );
    }

    return {
      totalDisputes,
      activeDisputes,
      resolvedDisputes: resolvedCount,
      cancelledDisputes: cancelledCountVal,
      failedArbitrationCount,
      byStatus: {
        // Spread the counts into the byStatus object
        [DisputeStatus.CREATED]: createdCount,
        [DisputeStatus.EVIDENCE_SUBMISSION]: evidenceSubmissionCount,
        [DisputeStatus.PENDING_ARBITRATION]: pendingArbitrationCount,
        [DisputeStatus.UNDER_ARBITRATION]: underArbitrationCount,
        [DisputeStatus.AWAITING_RULING]: awaitingRulingCount,
        [DisputeStatus.RULING_GIVEN]: rulingGivenCount,
        [DisputeStatus.APPEAL_PERIOD]: appealPeriodCount,
        [DisputeStatus.UNDER_APPEAL]: underAppealCount,
        [DisputeStatus.RULING_EXECUTED]: rulingExecutedCount,
        [DisputeStatus.SETTLED]: settledCount,
        [DisputeStatus.RESOLVED]: resolvedCount, // Include resolved as a sum
        [DisputeStatus.CANCELLED]: cancelledCountVal,
        [DisputeStatus.FAILED_ARBITRATION]: failedArbitrationCount,
      },
      averageResolutionDays,
      resolutionRate: totalDisputes > 0 ? (resolvedCount / totalDisputes) * 100 : 0,
    };
  }


   /**
   * Retrieves a list of disputes that are considered "active" (i.e., not in a terminal state).
   * @returns A promise that resolves to an array of active Dispute entities.
   */
  async getActiveDisputes(): Promise<Dispute[]> {
    this.logger.debug('Fetching all active disputes.');
    try {
      const activeStatuses: DisputeStatus[] = [
        DisputeStatus.CREATED,
        DisputeStatus.EVIDENCE_SUBMISSION,
        DisputeStatus.PENDING_ARBITRATION,
        DisputeStatus.UNDER_ARBITRATION,
        DisputeStatus.AWAITING_RULING,
        DisputeStatus.RULING_GIVEN, 
        DisputeStatus.APPEAL_PERIOD,
        DisputeStatus.UNDER_APPEAL,
      ];

      const disputes = await this.disputeRepository.find({
        where: {
          status: In(activeStatuses),
       
        },
        relations: ['parcel', 'evidenceEntries'], 
        order: { createdDate: 'DESC' }, 
      });

      this.logger.log(`Found ${disputes.length} active disputes.`);
      return disputes;
    } catch (error) {
      this.logger.error('Failed to fetch active disputes.', (error as Error).stack);
      throw new InternalServerErrorException('Could not retrieve active disputes.');
    }
  }


  async handleArbitrationPlatformUpdate(externalDisputeId: string, updateData: any): Promise<void> {
    this.logger.log(
      `Handling arbitration platform update for externalDisputeId: ${externalDisputeId}`,
    );
    const dispute = await this.disputeRepository.findOne({ where: { externalDisputeId } });
    if (!dispute) {
      this.logger.warn(
        `Dispute not found for externalDisputeId: ${externalDisputeId}. Ignoring update.`,
      );
      return;
    }

    const updates: Partial<UpdateDisputeDto> = {
      metadata: { ...(dispute.metadata || {}), arbitrationPlatformEvent: updateData },
    };
    // Example mapping logic - THIS NEEDS TO BE CUSTOMIZED TO YOUR ARBITRATION PLATFORM'S EVENTS
    if (updateData.klerosStatus === 'Appealable' || updateData.klerosStatus === 'Ruled') {
      // Example Kleros status
      updates.status = DisputeStatus.RULING_GIVEN;
      updates.ruling = this.mapExternalRulingToInternal(updateData.rulingOutcome); // Implement this
      updates.rulingDate = updateData.rulingTimestamp
        ? new Date(updateData.rulingTimestamp * 1000).toISOString()
        : new Date().toISOString();
      if (updateData.appealPeriodEndTimestamp) {
        updates.appealDeadline = new Date(updateData.appealPeriodEndTimestamp * 1000).toISOString();
        updates.status = DisputeStatus.APPEAL_PERIOD; // More specific if appeal period started
      }
    } else if (updateData.klerosStatus === 'Executing') {
      // If Kleros itself executes something
      updates.status = DisputeStatus.RULING_EXECUTED; // Or your equivalent
      updates.resolvedDate = new Date().toISOString();
    } else if (updateData.klerosStatus === 'EvidencePeriod') {
      updates.status = DisputeStatus.EVIDENCE_SUBMISSION;
    } else if (
      updateData.klerosStatus === 'CommitPeriod' ||
      updateData.klerosStatus === 'VotePeriod'
    ) {
      updates.status = DisputeStatus.UNDER_ARBITRATION;
    }
    // ... more comprehensive mapping needed ...

    if (Object.keys(updates).length > 1) {
      // Check if more than just metadata was updated
      this.logger.log(
        `Updating dispute ${dispute.id} based on arbitration platform webhook: ${JSON.stringify(updates)}`,
      );
      await this.updateDispute(
        dispute.id,
        updates as UpdateDisputeDto,
        'ArbitrationPlatformWebhook',
      );
    } else {
      this.logger.log(
        `No actionable status update from Kleros webhook for dispute ${dispute.id}. Data: ${JSON.stringify(updateData)}`,
      );
    }
  }

  private mapExternalRulingToInternal(externalRuling: any): DisputeRuling {
    // Customize this based on your arbitration platform's ruling values
    const rulingValue = Number(externalRuling); // Assuming it's a number
    switch (rulingValue) {
      case 0:
        return DisputeRuling.REFUSE_TO_ARBITRATE;
      case 1:
        return DisputeRuling.PLAINTIFF_WINS;
      case 2:
        return DisputeRuling.DEFENDANT_WINS;
      // Add cases for settlement, etc.
      default:
        return DisputeRuling.OTHER;
    }
  }
}
