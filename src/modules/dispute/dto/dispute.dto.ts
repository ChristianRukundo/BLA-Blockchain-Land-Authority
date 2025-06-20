// src/modules/dispute/dto/dispute.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsUUID,
  IsEthereumAddress,
  IsNumber,
  IsArray,
  Length,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DisputeStatus,
  DisputeType,
  DisputeRuling,
  DisputePartyType,
} from '../entities/dispute.entity';

// ... (CreateDisputeDto, SubmitEvidenceDto, UpdateDisputeDto, DisputeFilterDto as previously defined) ...
export class CreateDisputeDto {
  @ApiProperty({
    description: 'ID of the Land Parcel this dispute relates to',
    example: 'valid-uuid-for-parcel',
  })
  @IsUUID()
  parcelId: string;

  @ApiProperty({
    description: 'Type of the dispute',
    enum: DisputeType,
    example: DisputeType.BOUNDARY,
  })
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @ApiProperty({ description: 'Wallet address of the plaintiff (initiator)', example: '0x...' })
  @IsEthereumAddress()
  plaintiffAddress: string;

  @ApiProperty({ description: 'Wallet address of the defendant', example: '0x...' })
  @IsEthereumAddress()
  defendantAddress: string;

  @ApiPropertyOptional({
    description: 'Other involved parties (addresses)',
    type: [String],
    example: ['0x...'],
  })
  @IsOptional()
  @IsArray()
  @IsEthereumAddress({ each: true })
  involvedParties?: string[];

  @ApiProperty({ description: 'Title of the dispute', example: 'Boundary encroachment on Lot 12B' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the dispute claim',
    example: 'The defendant has built a fence 2 meters into my property...',
  })
  @IsString()
  @Length(20, 5000)
  description: string;

  @ApiPropertyOptional({ description: 'Deadline for evidence submission (ISO date string)' })
  @IsOptional()
  @IsDateString()
  evidenceSubmissionDeadline?: string;

  @ApiPropertyOptional({
    description: 'Initial evidence to submit (object with title, description, hash/URL)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubmitEvidenceDto)
  initialEvidence?: SubmitEvidenceDto;

  @ApiPropertyOptional({ description: 'Notes or internal comments for the dispute record' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadata for external systems (e.g., Kleros case details if known at creation)',
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SubmitEvidenceDto {
  @ApiProperty({ description: 'Title or brief name of the evidence', example: 'Surveyor Report X' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of what the evidence shows',
    example: 'Report from surveyor John Doe showing the correct boundary line.',
  })
  @IsString()
  @Length(10, 2000)
  description: string;

  @ApiProperty({
    description: 'IPFS hash or secure URL of the evidence file/document',
    example: 'ipfs://Qm...',
  })
  @IsString()
  @Length(10, 255)
  evidenceHashOrUrl: string;

  @ApiPropertyOptional({
    description: 'Type of the evidence file (e.g., PDF, image, video)',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  fileType?: string;

  @ApiPropertyOptional({ description: 'Size of the evidence file in bytes', example: 1048576 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Role of the submitter in this dispute',
    enum: DisputePartyType,
  })
  @IsOptional()
  @IsEnum(DisputePartyType)
  submitterRole?: DisputePartyType;

  @ApiPropertyOptional({ description: 'Additional metadata for the evidence' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateDisputeDto extends PartialType(CreateDisputeDto) {
  @ApiPropertyOptional({ description: 'Current status of the dispute', enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ description: 'On-chain/External dispute ID (e.g., Kleros dispute ID)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  externalDisputeId?: string;

  @ApiPropertyOptional({
    description: 'Date when the dispute was escalated to an external arbitrator',
  })
  @IsOptional()
  @IsDateString()
  escalationDate?: string;

  @ApiPropertyOptional({
    description: 'Arbitration fee paid (as string for large numbers like wei)',
  })
  @IsOptional()
  @IsString()
  arbitrationFeePaid?: string;

  @ApiPropertyOptional({ description: 'ID or name of the arbitration court/platform' })
  @IsOptional()
  @IsString()
  arbitrationCourtId?: string;

  @ApiPropertyOptional({ description: 'Number of arbitrators/jurors assigned' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfArbitrators?: number;

  @ApiPropertyOptional({ description: 'The final ruling given', enum: DisputeRuling })
  @IsOptional()
  @IsEnum(DisputeRuling)
  ruling?: DisputeRuling;

  @ApiPropertyOptional({ description: 'Date when the final ruling was given' })
  @IsOptional()
  @IsDateString()
  rulingDate?: string;

  @ApiPropertyOptional({ description: 'Detailed reasoning or text of the ruling' })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  rulingDetails?: string;

  @ApiPropertyOptional({
    description: 'Date when the ruling was actioned/executed or dispute settled',
  })
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiPropertyOptional({
    description: 'Transaction hash if ruling execution involved an on-chain transaction',
  })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  executionTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Deadline for filing an appeal' })
  @IsOptional()
  @IsDateString()
  appealDeadline?: string;

  @ApiPropertyOptional({ description: 'Number of times this dispute has been appealed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  appealCount?: number;

  @ApiPropertyOptional({ description: 'Fee paid for the latest appeal (as string)' })
  @IsOptional()
  @IsString()
  appealFeePaid?: string;

  @ApiPropertyOptional({ description: 'Amount agreed upon if the dispute was settled (as string)' })
  @IsOptional()
  @IsString()
  settlementAmount?: string;

  @ApiPropertyOptional({ description: 'Reason if the dispute was cancelled' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  cancellationReason?: string;
}

export class DisputeFilterDto {
  @ApiPropertyOptional({ description: 'Filter by parcel ID (DB UUID)' })
  @IsOptional()
  @IsUUID()
  parcelId?: string;
  @ApiPropertyOptional({ description: 'Filter by dispute type', enum: DisputeType })
  @IsOptional()
  @IsEnum(DisputeType)
  disputeType?: DisputeType;
  @ApiPropertyOptional({ description: 'Filter by status', enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
  @ApiPropertyOptional({ description: 'Filter by plaintiff address' })
  @IsOptional()
  @IsEthereumAddress()
  plaintiffAddress?: string;
  @ApiPropertyOptional({ description: 'Filter by defendant address' })
  @IsOptional()
  @IsEthereumAddress()
  defendantAddress?: string;
  @ApiPropertyOptional({ description: 'Filter by ruling', enum: DisputeRuling })
  @IsOptional()
  @IsEnum(DisputeRuling)
  ruling?: DisputeRuling;
  @ApiPropertyOptional({ description: 'Filter by created date from (ISO string)' })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;
  @ApiPropertyOptional({ description: 'Filter by created date to (ISO string)' })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;
  @ApiPropertyOptional({ description: 'Filter by active disputes only (true/false)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
  @ApiPropertyOptional({ description: 'Page number', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1) // Changed IsInt to IsNumber for flexibility
  page?: number = 1;
  @ApiPropertyOptional({ description: 'Items per page', default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdDate', type: String })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdDate';
  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// Renamed from SubmitToKlerosDto
export class SubmitToArbitrationDto {
  @ApiProperty({
    description: "ID or name of the arbitration platform's court/panel to use",
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  arbitrationPlatformCourtId: string; // Renamed from klerosCourtId

  @ApiPropertyOptional({
    description: 'Number of arbitrators/jurors requested for the case',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  numberOfArbitrators?: number; // Renamed from numberOfJurors

  @ApiProperty({
    description: 'Arbitration fee to be paid (as string, e.g., in wei)',
    example: '10000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  arbitrationFeePaid: string; // Renamed from arbitrationFee

  @ApiPropertyOptional({
    description:
      'Additional metadata for the arbitration platform (JSON object or stringified JSON)',
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Renamed from ExecuteRulingDto - this DTO is for *recording* a ruling, not executing consequences.
export class RecordRulingDto {
  @ApiProperty({
    description: 'The ruling given by the arbitrator',
    enum: DisputeRuling,
    example: DisputeRuling.PLAINTIFF_WINS,
  })
  @IsEnum(DisputeRuling)
  ruling: DisputeRuling;

  @ApiPropertyOptional({
    description: 'Date when the ruling was made (ISO string). Defaults to now if not provided.',
  })
  @IsOptional()
  @IsDateString()
  rulingDate?: string;

  @ApiPropertyOptional({ description: 'Detailed reasoning or text of the ruling decision' })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  rulingDetails?: string;

  @ApiPropertyOptional({
    description: 'Deadline for filing an appeal after this ruling (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  appealDeadline?: string;

  @ApiPropertyOptional({
    description:
      'External transaction hash if the ruling was recorded on-chain by arbitrator (rare)',
  })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  externalRulingTxHash?: string;

  @ApiPropertyOptional({ description: 'Notes related to the recording of this ruling' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

// This DTO is for executing the *consequences* of a ruling.
export class ExecuteConsequencesDto {
  @ApiPropertyOptional({
    description:
      'Transaction hash if applying the ruling involved an on-chain transaction by the system',
  })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  executionTransactionHash?: string;

  @ApiPropertyOptional({
    description: "Notes or details about the execution of the ruling's consequences",
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class AppealDisputeDto {
  @ApiProperty({
    description: 'Reason for appealing the ruling',
    example: 'Misinterpretation of evidence.',
  })
  @IsString()
  @Length(20, 2000)
  appealReason: string;

  @ApiPropertyOptional({
    description: 'IPFS hash or URL of any new/additional evidence for the appeal',
  })
  @IsOptional()
  @IsString()
  @Length(10, 255)
  additionalEvidenceHashOrUrl?: string;

  @ApiProperty({
    description: 'Appeal fee to be paid (as string, e.g., in wei)',
    example: '50000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  appealFeePaid: string;

  @ApiPropertyOptional({
    description:
      'Additional metadata for the appeal process (e.g., specific to arbitration platform)',
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CancelDisputeBodyDto {
  // New DTO for the body of cancel endpoint
  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  reason: string;
}

// --- Response DTOs ---
export class EvidenceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() disputeId: string;
  @ApiProperty() submitterAddress: string;
  @ApiPropertyOptional({ enum: DisputePartyType }) submitterRole?: DisputePartyType;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() evidenceHashOrUrl: string;
  @ApiPropertyOptional() fileType?: string;
  @ApiPropertyOptional() fileSize?: string;
  @ApiProperty() submittedDate: Date;
  @ApiPropertyOptional() metadata?: any;
}

export class DisputeResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() externalDisputeId?: string;
  @ApiProperty() parcelId: string;
  @ApiPropertyOptional()
  parcel?: any; 
  @ApiProperty({ enum: DisputeType }) disputeType: DisputeType;
  @ApiProperty({ enum: DisputeStatus }) status: DisputeStatus;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() plaintiffAddress: string;
  @ApiProperty() defendantAddress: string;
  @ApiPropertyOptional({ type: [String] }) involvedParties?: string[];
  @ApiProperty() createdDate: Date;
  @ApiPropertyOptional() evidenceSubmissionDeadline?: Date;
  @ApiPropertyOptional({ type: [EvidenceResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => EvidenceResponseDto)
  evidenceEntries?: EvidenceResponseDto[];
  @ApiPropertyOptional() escalationDate?: Date;
  @ApiPropertyOptional() arbitrationFeePaid?: string;
  @ApiPropertyOptional() arbitrationCourtId?: string;
  @ApiPropertyOptional() numberOfArbitrators?: number;
  @ApiPropertyOptional({ enum: DisputeRuling }) ruling?: DisputeRuling;
  @ApiPropertyOptional() rulingDate?: Date;
  @ApiPropertyOptional() rulingDetails?: string;
  @ApiPropertyOptional() resolvedDate?: Date;
  @ApiPropertyOptional() executionTransactionHash?: string;
  @ApiPropertyOptional() appealDeadline?: Date;
  @ApiProperty() appealCount: number;
  @ApiPropertyOptional() appealFeePaid?: string;
  @ApiPropertyOptional() settlementAmount?: string;
  @ApiPropertyOptional() cancellationReason?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() metadata?: any;
  @ApiProperty() updatedAt: Date;

  // Computed properties from entity
  @ApiProperty() canSubmitEvidence: boolean;
  @ApiProperty() canEscalateToArbitration: boolean;
  @ApiProperty() canAppeal: boolean;
  @ApiProperty() canExecuteRuling: boolean;
  @ApiProperty() isActive: boolean;
}

export class PaginatedDisputesResponseDto {
  // For PaginatedResult<DisputeResponseDto>
  @ApiProperty({ type: [DisputeResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => DisputeResponseDto)
  data: DisputeResponseDto[];

  @ApiProperty({ type: 'object', example: { page: 1, limit: 10, total: 100, totalPages: 10 } })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class DisputeStatisticsResponseDto {
  // For getDisputeStatistics
  @ApiProperty() totalDisputes: number;
  @ApiProperty() activeDisputes: number;
  @ApiProperty() resolvedDisputes: number;
  @ApiProperty() cancelledDisputes: number;
  @ApiProperty() failedArbitrationCount: number;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<DisputeStatus, number>;
  @ApiProperty() averageResolutionDays: number;
  @ApiProperty() resolutionRate: number;
}
