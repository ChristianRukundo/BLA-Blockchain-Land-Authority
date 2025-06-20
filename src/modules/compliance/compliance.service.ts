import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ComplianceReport, ComplianceStatus } from './entities/compliance-report.entity';
import {
  CreateComplianceReportDto,
  UpdateComplianceReportDto,
  ComplianceReportFilterDto,
} from './dto/compliance.dto'; // Assuming DTO filename is compliance.dto.ts
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService, CreateNotificationDto } from '../notification/notification.service'; // Import DTO
import { LaisService } from '../lais/lais.service';
import { PaginatedResult } from '../../shared/paginated-result.interface'; // Adjust path if needed
import { NotificationType } from '../notification/enums/notification.enum';
import { LandParcel } from '../lais/entities/land-parcel.entity'; // For parcel.ownerAddress and parcel.upi

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name); // Added logger

  constructor(
    @InjectRepository(ComplianceReport)
    private readonly complianceReportRepository: Repository<ComplianceReport>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly laisService: LaisService,
  ) {}

  async createReport(dto: CreateComplianceReportDto, creatorId?: string): Promise<ComplianceReport> { // Added optional creatorId
    this.logger.log(`Creating compliance report for parcel ID ${dto.parcelId}, initiator: ${creatorId || 'Unknown'}`);
    const parcel: LandParcel | null = await this.laisService.getLandParcelById(dto.parcelId); // Assuming getLandParcelById from LaisService
    if (!parcel) {
      throw new NotFoundException(`Land parcel with ID ${dto.parcelId} not found`);
    }

    let reportHash = dto.reportHash; // Assuming DTO uses reportHash
    if (dto.observationData && !reportHash) { // Assuming DTO has observationData
      this.logger.log(`Uploading observation data to IPFS for parcel ${dto.parcelId}`);
      reportHash = `ipfs://${await this.ipfsService.uploadJson({ // Prepend ipfs://
        ...dto.observationData,
        timestamp: new Date().toISOString(),
        parcelId: dto.parcelId,
        parcelUpi: parcel.upi, // For context in IPFS data
        ruleType: dto.ruleType,
        assessorId: dto.assessorId || creatorId, // Use assessorId from DTO or creatorId
      })}`;
    }

    const reportEntityData: Partial<ComplianceReport> = { // Use Partial for create
        ...dto,
        parcelId: dto.parcelId, // Explicitly set from DTO
        reportHash,
        assessmentDate: new Date(dto.assessmentDate),
        remediationDueDate: dto.remediationDueDate ? new Date(dto.remediationDueDate) : undefined,
        fineAmount: dto.fineAmount || 0,
        incentiveAmount: dto.incentiveAmount || 0,
        assessorId: dto.assessorId || creatorId, // Use DTO assessorId or creatorId
        isReviewed: false, // Default for new reports
    };
    const report = this.complianceReportRepository.create(reportEntityData);
    const savedReport = await this.complianceReportRepository.save(report);
    this.logger.log(`Compliance report ID ${savedReport.id} created for parcel ${dto.parcelId}.`);

    await this.laisService.updateComplianceStatus(dto.parcelId, dto.status, new Date(dto.assessmentDate));
    this.logger.log(`Updated LAIS compliance status for parcel ${dto.parcelId} to ${dto.status}.`);

    // --- Send notifications ---
    if (parcel.ownerAddress) {
        const notificationDto: CreateNotificationDto = {
            userId: parcel.ownerAddress,
            type: NotificationType.COMPLIANCE_REPORT_SUBMITTED,
            title: `New Compliance Report for Parcel ${parcel.upi || dto.parcelId}`,
            content: `A new compliance report (ID: ${savedReport.id}, Rule: ${savedReport.ruleType}, Status: ${savedReport.status}) has been submitted for your land parcel ${parcel.upi || dto.parcelId}.`,
            data: { reportId: savedReport.id, parcelId: dto.parcelId, parcelUpi: parcel.upi, status: savedReport.status, ruleType: savedReport.ruleType },
            relatedEntityId: savedReport.id,
            relatedEntityType: 'ComplianceReport',
        };
        await this.notificationService.createNotification(notificationDto);
    } else {
        this.logger.warn(`Parcel ${dto.parcelId} has no ownerAddress. Skipping new report notification to owner.`);
    }

    if (savedReport.status === ComplianceStatus.NON_COMPLIANT && (savedReport.fineAmount || 0) > 0) {
      await this.processFine(savedReport, parcel.ownerAddress);
    }

    if (savedReport.status === ComplianceStatus.COMPLIANT && (savedReport.incentiveAmount || 0) > 0) {
      await this.processIncentive(savedReport, parcel.ownerAddress);
    }

    return this.findOne(savedReport.id); // findOne should load relations if needed by mapToResponseDto
  }

  async findAll(filters: ComplianceReportFilterDto): Promise<PaginatedResult<ComplianceReport>> {
    // ... (findAll logic as you provided, ensure it uses logger) ...
    this.logger.debug(`Finding all compliance reports with filters: ${JSON.stringify(filters)}`);
    const query = this.complianceReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.parcel', 'parcel'); // Ensure parcel relation for potential UPI in logs

    if (filters.parcelId) query.andWhere('report.parcelId = :parcelId', { parcelId: filters.parcelId });
    if (filters.status) query.andWhere('report.status = :status', { status: filters.status });
    if (filters.ruleType) query.andWhere('report.ruleType ILIKE :ruleType', { ruleType: `%${filters.ruleType}%` }); // Partial match
    if (filters.assessorId) query.andWhere('report.assessorId = :assessorId', { assessorId: filters.assessorId });
    if (filters.assessmentDateFrom) query.andWhere('report.assessmentDate >= :from', { from: new Date(filters.assessmentDateFrom) });
    if (filters.assessmentDateTo) query.andWhere('report.assessmentDate <= :to', { to: new Date(filters.assessmentDateTo) });
    if (filters.isReviewed !== undefined) query.andWhere('report.isReviewed = :isReviewed', { isReviewed: filters.isReviewed });

    // Handle overdueOnly and validOnly (assuming your DTO was updated to pass these)
    if (filters.overdueOnly === true) {
        query.andWhere('report.status = :nonCompliantStatus', { nonCompliantStatus: ComplianceStatus.NON_COMPLIANT })
             .andWhere('report.remediationDueDate IS NOT NULL')
             .andWhere('report.remediationDueDate < :now', { now: new Date() });
    }
    if (filters.validOnly === true) { // Assuming 'valid' means validUntil is in the future
        query.andWhere('report.validUntil IS NOT NULL')
             .andWhere('report.validUntil >= :now', { now: new Date() });
    }

    const validSortFields = ['id', 'assessmentDate', 'status', 'ruleType', 'parcelId', 'complianceScore', 'createdAt', 'updatedAt', 'remediationDueDate', 'validUntil', 'isReviewed'];
    const sortBy = validSortFields.includes(filters.sortBy || 'assessmentDate') ? filters.sortBy || 'assessmentDate' : 'assessmentDate';
    const sortOrder = ['ASC', 'DESC'].includes((filters.sortOrder || 'DESC').toUpperCase()) ? (filters.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC' : 'DESC';

    query.orderBy(`report.${sortBy}`, sortOrder);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [reports, total] = await query.getManyAndCount();

    return {
      data: reports,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit)},
    };
  }

  async findOne(id: string): Promise<ComplianceReport> {
    this.logger.debug(`Finding compliance report by ID: ${id}`);
    const report = await this.complianceReportRepository.findOne({
      where: { id },
      relations: ['parcel'], // Eager load parcel
    });
    if (!report) {
      throw new NotFoundException(`Compliance report with ID "${id}" not found`);
    }
    return report;
  }

  async findByParcelId(parcelId: string): Promise<ComplianceReport[]> { // Renamed from findByParcel
    this.logger.debug(`Finding compliance reports for parcel ID: ${parcelId}`);
    return this.complianceReportRepository.find({
      where: { parcelId },
      relations: ['parcel'],
      order: { assessmentDate: 'DESC' },
    });
  }

  async updateReport(id: string, dto: UpdateComplianceReportDto, updaterId: string): Promise<ComplianceReport> { // Renamed and added updaterId
    this.logger.log(`Updating compliance report ID ${id}, initiated by ${updaterId}`);
    const report = await this.findOne(id); // Fetches with parcel relation
    const oldStatus = report.status;
    const parcel = report.parcel || (report.parcelId ? await this.laisService.getLandParcelById(report.parcelId) : null);


    if (dto.reportHash && !dto.reportHash.startsWith('ipfs://') && !dto.reportHash.startsWith('http')) {
        this.logger.warn(`Report hash "${dto.reportHash}" for update does not start with ipfs:// or http. Ensure it's a full URI or just the hash if your IPFS service handles prefixing.`);
     
    }
    if (dto.observationData && (!dto.reportHash || dto.reportHash !== report.reportHash)) {
        const ipfsContentHash = await this.ipfsService.uploadJson({
            parcelId: report.parcelId, upi: parcel?.upi, ruleType: dto.ruleType || report.ruleType,
            assessmentDate: dto.assessmentDate ? new Date(dto.assessmentDate) : report.assessmentDate,
            observation: dto.observationData, updateTimestamp: new Date().toISOString(), updaterId
        });
        dto.reportHash = `ipfs://${ipfsContentHash}`;
        this.logger.log(`Report ${id} observation data updated to IPFS: ${dto.reportHash}`);
    }


    // Merge only defined properties from DTO
    const updatePayload: Partial<ComplianceReport> = {};
    (Object.keys(dto) as Array<keyof UpdateComplianceReportDto>).forEach(key => {
        if (dto[key] !== undefined) { // Only process keys actually present in the DTO
            if ((key === 'assessmentDate' || key === 'validUntil' || key === 'remediationDueDate' || key === 'finePaidDate' || key === 'incentiveAwardedDate' || key === 'reviewDate') && dto[key]) {
                (updatePayload as any)[key] = new Date(dto[key] as string);
            } else {
                (updatePayload as any)[key] = dto[key];
            }
        }
    });
    if (dto.notes) {
        updatePayload.notes = report.notes ? `${report.notes}\nUpdate by ${updaterId}: ${dto.notes}` : `Update by ${updaterId}: ${dto.notes}`;
    }

    this.complianceReportRepository.merge(report, updatePayload);
    const updatedReport = await this.complianceReportRepository.save(report);
    this.logger.log(`Compliance report ID ${id} updated.`);

    if (dto.status && dto.status !== oldStatus) {
      await this.laisService.updateComplianceStatus(report.parcelId, dto.status, updatedReport.assessmentDate);
      if (parcel?.ownerAddress) {
        const notificationDto: CreateNotificationDto = {
            userId: parcel.ownerAddress,
            type: NotificationType.COMPLIANCE_STATUS_UPDATED_VIA_REPORT, // Or a more general COMPLIANCE_REPORT_UPDATED
            title: `Compliance Update for Parcel ${parcel.upi || report.parcelId}`,
            content: `The compliance status for your parcel ${parcel.upi || report.parcelId} (Report ID: ${updatedReport.id}) has been updated from ${oldStatus} to ${updatedReport.status}. Rule: ${updatedReport.ruleType}.`,
            data: { reportId: updatedReport.id, parcelId: report.parcelId, parcelUpi: parcel.upi, oldStatus, newStatus: updatedReport.status },
            relatedEntityId: updatedReport.id, relatedEntityType: 'ComplianceReport'
        };
        await this.notificationService.createNotification(notificationDto);
      }
    }
    return this.findOne(updatedReport.id);
  }

  // ... getComplianceStatistics, getOverdueReports methods as previously defined ...
  async getComplianceStatistics(parcelId?: string): Promise<any> {
    this.logger.debug(`Getting compliance statistics for parcel ID: ${parcelId || 'all parcels'}`);
    const query = this.complianceReportRepository.createQueryBuilder('report');
    if (parcelId) {
      query.andWhere('report.parcelId = :parcelId', { parcelId });
    }

    const statusCountsRaw = await query.select('report.status', 'status')
                                .addSelect('COUNT(report.id)::int', 'count')
                                .groupBy('report.status')
                                .getRawMany<{ status: ComplianceStatus, count: number }>();

    const stats: Record<string, number> = {};
    Object.values(ComplianceStatus).forEach(s => stats[s] = 0);
    statusCountsRaw.forEach(sc => stats[sc.status] = sc.count);

    const totalReports = await this.complianceReportRepository.count( parcelId ? {where: {parcelId}} : {});
    const compliantReports = stats[ComplianceStatus.COMPLIANT] || 0;
    const complianceRate = totalReports > 0 ? (compliantReports / totalReports) * 100 : 0;

    return {
      totalReports,
      compliantReports,
      nonCompliantReports: stats[ComplianceStatus.NON_COMPLIANT] || 0,
      underReviewReports: stats[ComplianceStatus.UNDER_REVIEW] || 0,
      pendingAssessmentReports: stats[ComplianceStatus.PENDING_ASSESSMENT] || 0,
      complianceRate: parseFloat(complianceRate.toFixed(2)), // Format to 2 decimal places
      byStatus: stats,
    };
  }

  async getOverdueReports(): Promise<ComplianceReport[]> {
    this.logger.debug('Fetching overdue compliance reports.');
    return this.complianceReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.parcel', 'parcel')
      .where('report.status = :status', { status: ComplianceStatus.NON_COMPLIANT })
      .andWhere('report.remediationDueDate IS NOT NULL')
      .andWhere('report.remediationDueDate < :now', { now: new Date() })
      .orderBy('report.remediationDueDate', 'ASC')
      .getMany();
  }


  async markAsReviewed(id: string, reviewerId: string, reviewNotes?: string): Promise<ComplianceReport> {
    this.logger.log(`Marking compliance report ID ${id} as reviewed by ${reviewerId}`);
    const report = await this.findOne(id); // Will fetch parcel relation
    if (report.isReviewed) {
      this.logger.warn(`Report ${id} already reviewed by ${report.reviewerId || 'unknown'} on ${report.reviewDate?.toISOString()}. Current reviewer: ${reviewerId}.`);
      // Allow re-review or throw BadRequestException depending on policy
      // throw new BadRequestException(`Report ${id} has already been reviewed.`);
    }

    report.isReviewed = true;
    report.reviewerId = reviewerId;
    report.reviewNotes = reviewNotes;
    report.reviewDate = new Date(); // Ensure reviewDate field exists in ComplianceReport entity

    const updatedReport = await this.complianceReportRepository.save(report);
    this.logger.log(`Compliance report ID ${id} marked as reviewed.`);

    if (report.parcel?.ownerAddress) {
      const notificationDto: CreateNotificationDto = {
        userId: report.parcel.ownerAddress,
        type: NotificationType.COMPLIANCE_REPORT_REVIEWED,
        title: `Compliance Report Reviewed: Parcel ${report.parcel.upi || report.parcelId}`,
        content: `The compliance report (ID: ${report.id}, Rule: ${report.ruleType}) for your parcel ${report.parcel.upi || report.parcelId} has been reviewed by an official. Review notes: ${reviewNotes || 'N/A'}`,
        data: { reportId: report.id, parcelId: report.parcelId, parcelUpi: report.parcel.upi, reviewerId, reviewNotes: reviewNotes || '' },
        relatedEntityId: report.id, relatedEntityType: 'ComplianceReport'
      };
      await this.notificationService.createNotification(notificationDto);
    }
    return updatedReport;
  }

  private async processFine(report: ComplianceReport, parcelOwnerAddress: string | undefined): Promise<void> {
    this.logger.log(`Processing fine of ${report.fineAmount || 0} for parcel ${report.parcelId}, report ${report.id}`);
    if (!parcelOwnerAddress) {
        this.logger.warn(`Cannot process fine for report ${report.id}: Parcel owner address is missing.`);
        return;
    }
    if ((report.fineAmount || 0) <= 0) {
        this.logger.log(`No fine amount (or zero) to process for report ${report.id}.`);
        return;
    }

    try {
      this.logger.log(`Placeholder: Actual fine processing logic for ${report.fineAmount} from owner ${parcelOwnerAddress}.`);
      const simulatedTxHash = `0x_fine_${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;

      report.transactionHash = simulatedTxHash; // For fine payment tx
      report.finePaidDate = new Date(); // Assume paid now
      await this.complianceReportRepository.save(report);
      this.logger.log(`Simulated fine processed for report ${report.id}. Tx: ${simulatedTxHash}`);

      const notificationDto: CreateNotificationDto = {
          userId: parcelOwnerAddress,
          type: NotificationType.COMPLIANCE_FINE_ISSUED,
          title: `Compliance Fine Issued: Parcel ${report.parcel?.upi || report.parcelId}`,
          content: `A fine of ${report.fineAmount} has been issued due to non-compliance (Report ID: ${report.id}, Rule: ${report.ruleType}) on parcel ${report.parcel?.upi || report.parcelId}. Payment Tx: ${simulatedTxHash}`,
          data: { reportId: report.id, parcelId: report.parcelId, parcelUpi: report.parcel?.upi, fineAmount: report.fineAmount, txHash: simulatedTxHash },
          relatedEntityId: report.id, relatedEntityType: 'ComplianceReport'
      };
      await this.notificationService.createNotification(notificationDto);
    } catch (error) {
      this.logger.error(`Failed to process fine for report ${report.id}: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  private async processIncentive(report: ComplianceReport, parcelOwnerAddress: string | undefined): Promise<void> {
    this.logger.log(`Processing incentive of ${report.incentiveAmount || 0} for parcel ${report.parcelId}, report ${report.id}`);
    if (!parcelOwnerAddress) {
        this.logger.warn(`Cannot process incentive for report ${report.id}: Parcel owner address is missing.`);
        return;
    }
    if ((report.incentiveAmount || 0) <= 0) {
        this.logger.log(`No incentive amount (or zero) to process for report ${report.id}.`);
        return;
    }

    try {
      this.logger.log(`Placeholder: Actual incentive processing logic for ${report.incentiveAmount} to owner ${parcelOwnerAddress}.`);
      const simulatedTxHash = `0x_incentive_${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;
      report.transactionHash = simulatedTxHash; // For incentive award tx
      report.incentiveAwardedDate = new Date(); // Assume awarded now
      await this.complianceReportRepository.save(report);
      this.logger.log(`Simulated incentive processed for report ${report.id}. Tx: ${simulatedTxHash}`);

      const notificationDto: CreateNotificationDto = {
          userId: parcelOwnerAddress,
          type: NotificationType.COMPLIANCE_INCENTIVE_AWARDED,
          title: `Compliance Incentive Awarded: Parcel ${report.parcel?.upi || report.parcelId}`,
          content: `An incentive of ${report.incentiveAmount} has been awarded for compliance (Report ID: ${report.id}, Rule: ${report.ruleType}) regarding parcel ${report.parcel?.upi || report.parcelId}. Transaction: ${simulatedTxHash}`,
          data: { reportId: report.id, parcelId: report.parcelId, parcelUpi: report.parcel?.upi, incentiveAmount: report.incentiveAmount, txHash: simulatedTxHash },
          relatedEntityId: report.id, relatedEntityType: 'ComplianceReport'
      };
      await this.notificationService.createNotification(notificationDto);
    } catch (error) {
      this.logger.error(`Failed to process incentive for report ${report.id}: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}