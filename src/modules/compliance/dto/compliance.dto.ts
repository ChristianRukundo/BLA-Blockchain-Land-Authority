import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ComplianceStatus } from '../entities/compliance.entity';

export class CreateComplianceReportDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsString()
  parcelId: string;

  @ApiProperty({ description: 'Type of compliance rule' })
  @IsString()
  ruleType: string;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiProperty({ description: 'Compliance score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore: number;

  @ApiProperty({ description: 'Assessment date' })
  @IsDateString()
  assessmentDate: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Assessor wallet address' })
  @IsOptional()
  @IsString()
  assessorAddress?: string;

  @ApiPropertyOptional({ description: 'Assessment details' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'Fine amount levied' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fineAmount?: number;

  @ApiPropertyOptional({ description: 'Incentive amount awarded' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incentiveAmount?: number;

  @ApiPropertyOptional({ description: 'Remediation deadline' })
  @IsOptional()
  @IsDateString()
  remediationDeadline?: string;

  @ApiPropertyOptional({ description: 'Evidence hash from IPFS' })
  @IsOptional()
  @IsString()
  evidenceHash?: string;

  @ApiPropertyOptional({ description: 'Oracle request ID' })
  @IsOptional()
  @IsString()
  oracleRequestId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateComplianceReportDto {
  @ApiPropertyOptional({ description: 'Compliance status', enum: ComplianceStatus })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Compliance score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore?: number;

  @ApiPropertyOptional({ description: 'Assessment date' })
  @IsOptional()
  @IsDateString()
  assessmentDate?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Assessor wallet address' })
  @IsOptional()
  @IsString()
  assessorAddress?: string;

  @ApiPropertyOptional({ description: 'Assessment details' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'Fine amount levied' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fineAmount?: number;

  @ApiPropertyOptional({ description: 'Whether fine has been paid' })
  @IsOptional()
  @IsBoolean()
  finePaid?: boolean;

  @ApiPropertyOptional({ description: 'Incentive amount awarded' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incentiveAmount?: number;

  @ApiPropertyOptional({ description: 'Whether incentive has been awarded' })
  @IsOptional()
  @IsBoolean()
  incentiveAwarded?: boolean;

  @ApiPropertyOptional({ description: 'Remediation deadline' })
  @IsOptional()
  @IsDateString()
  remediationDeadline?: string;

  @ApiPropertyOptional({ description: 'Evidence hash from IPFS' })
  @IsOptional()
  @IsString()
  evidenceHash?: string;

  @ApiPropertyOptional({ description: 'Oracle request ID' })
  @IsOptional()
  @IsString()
  oracleRequestId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ComplianceReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsString()
  parcelId?: string;

  @ApiPropertyOptional({ description: 'Filter by rule type' })
  @IsOptional()
  @IsString()
  ruleType?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ComplianceStatus })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Filter by assessor address' })
  @IsOptional()
  @IsString()
  assessorAddress?: string;

  @ApiPropertyOptional({ description: 'Filter from assessment date' })
  @IsOptional()
  @IsDateString()
  assessmentDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to assessment date' })
  @IsOptional()
  @IsDateString()
  assessmentDateTo?: string;

  @ApiPropertyOptional({ description: 'Show only overdue reports' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  overdueOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only valid reports' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  validOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'assessmentDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'assessmentDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class CreateComplianceRuleDto {
  @ApiProperty({ description: 'Rule type identifier' })
  @IsString()
  ruleType: string;

  @ApiProperty({ description: 'Rule description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Rule category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Fine amount for violations' })
  @IsNumber()
  @Min(0)
  fineAmount: number;

  @ApiProperty({ description: 'Incentive amount for compliance' })
  @IsNumber()
  @Min(0)
  incentiveAmount: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Rule parameters in JSON format' })
  @IsOptional()
  parameters?: any;

  @ApiPropertyOptional({ description: 'Assessment frequency in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  assessmentFrequency?: number = 30;

  @ApiPropertyOptional({ description: 'Remediation period in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  remediationPeriod?: number = 30;
}

export class UpdateComplianceRuleDto {
  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Rule category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Fine amount for violations' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fineAmount?: number;

  @ApiPropertyOptional({ description: 'Incentive amount for compliance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incentiveAmount?: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Rule parameters in JSON format' })
  @IsOptional()
  parameters?: any;

  @ApiPropertyOptional({ description: 'Assessment frequency in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  assessmentFrequency?: number;

  @ApiPropertyOptional({ description: 'Remediation period in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  remediationPeriod?: number;
}

export class ComplianceRuleFilterDto {
  @ApiPropertyOptional({ description: 'Filter by rule type' })
  @IsOptional()
  @IsString()
  ruleType?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'ruleType' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'ruleType';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class TriggerAssessmentDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsString()
  parcelId: string;

  @ApiProperty({ description: 'Type of compliance rule' })
  @IsString()
  ruleType: string;

  @ApiPropertyOptional({ description: 'Use oracle for assessment', default: false })
  @IsOptional()
  @IsBoolean()
  useOracle?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether parcel is compliant (for manual assessment)' })
  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;

  @ApiPropertyOptional({ description: 'Compliance score (0-100, for manual assessment)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore?: number;

  @ApiPropertyOptional({ description: 'Assessor address (for manual assessment)' })
  @IsOptional()
  @IsString()
  assessorAddress?: string;

  @ApiPropertyOptional({ description: 'Assessment details' })
  @IsOptional()
  @IsString()
  details?: string;
}

