import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ComplianceStatus, ComplianceRuleType } from '../entities/compliance-report.entity';

export class CreateComplianceReportDto {
  @ApiProperty({ description: 'Land parcel ID', example: 'uuid' })
  @IsUUID()
  parcelId: string;

  @ApiProperty({ description: 'Compliance rule type', enum: ComplianceRuleType })
  @IsEnum(ComplianceRuleType)
  ruleType: ComplianceRuleType;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiProperty({ description: 'Assessment date', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  assessmentDate: string;

  @ApiProperty({ description: 'Oracle observation data', type: 'object' })
  @IsObject()
  observationData: any;

  @ApiProperty({ description: 'IPFS hash of detailed report', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reportHash?: string;

  @ApiProperty({ description: 'Fine amount in MockRWF tokens', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fineAmount?: number;

  @ApiProperty({ description: 'Incentive amount in EcoCredits', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incentiveAmount?: number;

  @ApiProperty({ description: 'Transaction hash for fine/incentive', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  transactionHash?: string;

  @ApiProperty({ description: 'Compliance score (0-100)', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore?: number;

  @ApiProperty({ description: 'Violation description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  violationDescription?: string;

  @ApiProperty({ description: 'Remediation actions required', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remediationActions?: string;

  @ApiProperty({ description: 'Due date for remediation', required: false })
  @IsOptional()
  @IsDateString()
  remediationDueDate?: string;

  @ApiProperty({ description: 'Whether the report has been reviewed', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isReviewed?: boolean;

  @ApiProperty({ description: 'Reviewer ID', required: false })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiProperty({ description: 'Review notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reviewNotes?: string;
}

export class UpdateComplianceReportDto {
  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus, required: false })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiProperty({ description: 'IPFS hash of detailed report', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reportHash?: string;

  @ApiProperty({ description: 'Fine amount in MockRWF tokens', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fineAmount?: number;

  @ApiProperty({ description: 'Incentive amount in EcoCredits', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incentiveAmount?: number;

  @ApiProperty({ description: 'Transaction hash for fine/incentive', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  transactionHash?: string;

  @ApiProperty({ description: 'Compliance score (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore?: number;

  @ApiProperty({ description: 'Violation description', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  violationDescription?: string;

  @ApiProperty({ description: 'Remediation actions required', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remediationActions?: string;

  @ApiProperty({ description: 'Due date for remediation', required: false })
  @IsOptional()
  @IsDateString()
  remediationDueDate?: string;

  @ApiProperty({ description: 'Whether the report has been reviewed', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isReviewed?: boolean;

  @ApiProperty({ description: 'Reviewer ID', required: false })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiProperty({ description: 'Review notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reviewNotes?: string;
}

export class ComplianceReportFilterDto {
  @ApiProperty({ description: 'Filter by parcel ID', required: false })
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiProperty({ description: 'Filter by compliance status', enum: ComplianceStatus, required: false })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiProperty({ description: 'Filter by rule type', enum: ComplianceRuleType, required: false })
  @IsOptional()
  @IsEnum(ComplianceRuleType)
  ruleType?: ComplianceRuleType;

  @ApiProperty({ description: 'Filter by assessment date from', required: false })
  @IsOptional()
  @IsDateString()
  assessmentDateFrom?: string;

  @ApiProperty({ description: 'Filter by assessment date to', required: false })
  @IsOptional()
  @IsDateString()
  assessmentDateTo?: string;

  @ApiProperty({ description: 'Filter by review status', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isReviewed?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Sort field', required: false, default: 'assessmentDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'assessmentDate';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

