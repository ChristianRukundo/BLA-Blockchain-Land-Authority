import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceReport, ComplianceStatus } from './entities/compliance-report.entity';
import {
  CreateComplianceReportDto,
  UpdateComplianceReportDto,
  ComplianceReportFilterDto,
} from './dto/create-compliance-report.dto';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { LaisService } from '../lais/lais.service';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceReport)
    private complianceReportRepository: Repository<ComplianceReport>,
    private ipfsService: IpfsService,
    private notificationService: NotificationService,
    private laisService: LaisService,
  ) {}

  async createReport(dto: CreateComplianceReportDto): Promise<ComplianceReport> {
    // Verify parcel exists
    const parcel = await this.laisService.findOne(dto.parcelId);
    if (!parcel) {
      throw new NotFoundException(`Land parcel with ID ${dto.parcelId} not found`);
    }

    // Upload observation data to IPFS if not already provided
    let reportHash = dto.reportHash;
    if (dto.observationData && !reportHash) {
      reportHash = await this.ipfsService.uploadJson({
        ...dto.observationData,
        timestamp: new Date().toISOString(),
        parcelId: dto.parcelId,
        ruleType: dto.ruleType,
      });
    }

    // Create compliance report
    const report = this.complianceReportRepository.create({
      ...dto,
      reportHash,
      assessmentDate: new Date(dto.assessmentDate),
      remediationDueDate: dto.remediationDueDate ? new Date(dto.remediationDueDate) : null,
    });

    // Save report
    const savedReport = await this.complianceReportRepository.save(report);

    // Update parcel compliance status
    await this.laisService.updateComplianceStatus(dto.parcelId, dto.status);

    // Send notifications
    await this.notificationService.notifyComplianceReport(savedReport);

    // Handle fines and incentives
    if (report.status === ComplianceStatus.NON_COMPLIANT && report.fineAmount > 0) {
      await this.processFine(savedReport);
    }

    if (report.status === ComplianceStatus.COMPLIANT && report.incentiveAmount > 0) {
      await this.processIncentive(savedReport);
    }

    return this.findOne(savedReport.id);
  }

  async findAll(filters: ComplianceReportFilterDto): Promise<PaginatedResult<ComplianceReport>> {
    const query = this.complianceReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.parcel', 'parcel');

    // Apply filters
    if (filters.parcelId) {
      query.andWhere('report.parcelId = :parcelId', { parcelId: filters.parcelId });
    }

    if (filters.status) {
      query.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters.ruleType) {
      query.andWhere('report.ruleType = :ruleType', { ruleType: filters.ruleType });
    }

    if (filters.assessmentDateFrom) {
      query.andWhere('report.assessmentDate >= :from', { from: filters.assessmentDateFrom });
    }

    if (filters.assessmentDateTo) {
      query.andWhere('report.assessmentDate <= :to', { to: filters.assessmentDateTo });
    }

    if (filters.isReviewed !== undefined) {
      query.andWhere('report.isReviewed = :isReviewed', { isReviewed: filters.isReviewed });
    }

    // Add sorting
    query.orderBy(`report.${filters.sortBy}`, filters.sortOrder);

    // Add pagination
    const skip = (filters.page - 1) * filters.limit;
    query.skip(skip).take(filters.limit);

    // Execute query
    const [reports, total] = await query.getManyAndCount();

    return {
      data: reports,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string): Promise<ComplianceReport> {
    const report = await this.complianceReportRepository.findOne({
      where: { id },
      relations: ['parcel'],
    });

    if (!report) {
      throw new NotFoundException(`Compliance report with ID ${id} not found`);
    }

    return report;
  }

  async findByParcel(parcelId: string): Promise<ComplianceReport[]> {
    return this.complianceReportRepository.find({
      where: { parcelId },
      relations: ['parcel'],
      order: { assessmentDate: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateComplianceReportDto): Promise<ComplianceReport> {
    const report = await this.findOne(id);

    // Upload new observation data to IPFS if provided
    if (dto.reportHash) {
      // Validate IPFS hash format
      if (!/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(dto.reportHash)) {
        throw new BadRequestException('Invalid IPFS hash format');
      }
    }

    // Update report
    Object.assign(report, {
      ...dto,
      remediationDueDate: dto.remediationDueDate ? new Date(dto.remediationDueDate) : report.remediationDueDate,
    });

    const updatedReport = await this.complianceReportRepository.save(report);

    // Update parcel compliance status if changed
    if (dto.status && dto.status !== report.status) {
      await this.laisService.updateComplianceStatus(report.parcelId, dto.status);
    }

    // Send notifications
    await this.notificationService.notifyComplianceUpdate(updatedReport);

    return this.findOne(updatedReport.id);
  }

  async getComplianceStatistics(parcelId?: string): Promise<any> {
    const query = this.complianceReportRepository.createQueryBuilder('report');

    if (parcelId) {
      query.where('report.parcelId = :parcelId', { parcelId });
    }

    const [
      totalReports,
      compliantReports,
      nonCompliantReports,
      underReviewReports,
      pendingReports,
    ] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('report.status = :status', { status: ComplianceStatus.COMPLIANT }).getCount(),
      query.clone().andWhere('report.status = :status', { status: ComplianceStatus.NON_COMPLIANT }).getCount(),
      query.clone().andWhere('report.status = :status', { status: ComplianceStatus.UNDER_REVIEW }).getCount(),
      query.clone().andWhere('report.status = :status', { status: ComplianceStatus.PENDING_ASSESSMENT }).getCount(),
    ]);

    const complianceRate = totalReports > 0 ? (compliantReports / totalReports) * 100 : 0;

    return {
      totalReports,
      compliantReports,
      nonCompliantReports,
      underReviewReports,
      pendingReports,
      complianceRate: Math.round(complianceRate * 100) / 100,
    };
  }

  async getOverdueReports(): Promise<ComplianceReport[]> {
    return this.complianceReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.parcel', 'parcel')
      .where('report.status = :status', { status: ComplianceStatus.NON_COMPLIANT })
      .andWhere('report.remediationDueDate < :now', { now: new Date() })
      .orderBy('report.remediationDueDate', 'ASC')
      .getMany();
  }

  async markAsReviewed(id: string, reviewerId: string, reviewNotes?: string): Promise<ComplianceReport> {
    const report = await this.findOne(id);

    report.isReviewed = true;
    report.reviewerId = reviewerId;
    report.reviewNotes = reviewNotes;

    const updatedReport = await this.complianceReportRepository.save(report);

    // Send notification
    await this.notificationService.notifyComplianceReviewed(updatedReport);

    return updatedReport;
  }

  private async processFine(report: ComplianceReport): Promise<void> {
    try {
      // This would integrate with the smart contract to levy fines
      // For now, we'll simulate the process
      console.log(`Processing fine of ${report.fineAmount} MockRWF for parcel ${report.parcelId}`);
      
      // In a real implementation, this would:
      // 1. Call the ComplianceRuleEngine smart contract
      // 2. Levy the fine in MockRWF tokens
      // 3. Update the transaction hash
      
      // Simulate transaction hash
      report.transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      await this.complianceReportRepository.save(report);

      // Send notification about fine
      await this.notificationService.notifyComplianceFine(report);
    } catch (error) {
      console.error('Failed to process fine:', error);
      // Handle error appropriately - maybe retry or alert admins
    }
  }

  private async processIncentive(report: ComplianceReport): Promise<void> {
    try {
      // This would integrate with the smart contract to award incentives
      // For now, we'll simulate the process
      console.log(`Processing incentive of ${report.incentiveAmount} EcoCredits for parcel ${report.parcelId}`);
      
      // In a real implementation, this would:
      // 1. Call the ComplianceRuleEngine smart contract
      // 2. Award EcoCredits to the land owner
      // 3. Update the transaction hash
      
      // Simulate transaction hash
      report.transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      await this.complianceReportRepository.save(report);

      // Send notification about incentive
      await this.notificationService.notifyComplianceIncentive(report);
    } catch (error) {
      console.error('Failed to process incentive:', error);
      // Handle error appropriately - maybe retry or alert admins
    }
  }
}

