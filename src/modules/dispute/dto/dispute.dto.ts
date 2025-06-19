import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DisputeStatus, DisputeType, DisputeRuling } from '../entities/dispute.entity';

export class CreateDisputeDto {
  @ApiProperty({ description: 'Land parcel ID', example: 'uuid' })
  @IsUUID()
  parcelId: string;

  @ApiProperty({ description: 'Dispute type', enum: DisputeType })
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @ApiProperty({ description: 'Plaintiff address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  plaintiffAddress: string;

  @ApiProperty({ description: 'Defendant address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  defendantAddress: string;

  @ApiProperty({ description: 'Dispute title', example: 'Boundary dispute over northern fence' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the dispute' })
  @IsString()
  @Length(20, 2000)
  description: string;

  @ApiProperty({ description: 'Date when dispute was created', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  createdDate: string;

  @ApiProperty({ description: 'IPFS hash of initial evidence', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  evidenceHash?: string;

  @ApiProperty({ description: 'Kleros court ID to use', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  klerosCourtId?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateDisputeDto {
  @ApiProperty({ description: 'Dispute status', enum: DisputeStatus, required: false })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiProperty({ description: 'IPFS hash of evidence bundle', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  evidenceHash?: string;

  @ApiProperty({ description: 'Kleros dispute ID', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  klerosDisputeId?: string;

  @ApiProperty({ description: 'Kleros court ID', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  klerosCourtId?: number;

  @ApiProperty({ description: 'Number of jurors assigned', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfJurors?: number;

  @ApiProperty({ description: 'Arbitration fee paid', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  arbitrationFee?: number;

  @ApiProperty({ description: 'Current ruling', enum: DisputeRuling, required: false })
  @IsOptional()
  @IsEnum(DisputeRuling)
  ruling?: DisputeRuling;

  @ApiProperty({ description: 'Ruling details and reasoning', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  rulingDetails?: string;

  @ApiProperty({ description: 'Date when ruling was made', required: false })
  @IsOptional()
  @IsDateString()
  rulingDate?: string;

  @ApiProperty({ description: 'Transaction hash for ruling execution', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Settlement amount if applicable', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  settlementAmount?: number;

  @ApiProperty({ description: 'Additional metadata from Kleros', required: false })
  @IsOptional()
  @IsObject()
  klerosMetadata?: any;

  @ApiProperty({ description: 'Whether the dispute can be appealed', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  canAppeal?: boolean;

  @ApiProperty({ description: 'Appeal deadline', required: false })
  @IsOptional()
  @IsDateString()
  appealDeadline?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class DisputeFilterDto {
  @ApiProperty({ description: 'Filter by parcel ID', required: false })
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiProperty({ description: 'Filter by dispute type', enum: DisputeType, required: false })
  @IsOptional()
  @IsEnum(DisputeType)
  disputeType?: DisputeType;

  @ApiProperty({ description: 'Filter by status', enum: DisputeStatus, required: false })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiProperty({ description: 'Filter by plaintiff address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  plaintiffAddress?: string;

  @ApiProperty({ description: 'Filter by defendant address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  defendantAddress?: string;

  @ApiProperty({ description: 'Filter by ruling', enum: DisputeRuling, required: false })
  @IsOptional()
  @IsEnum(DisputeRuling)
  ruling?: DisputeRuling;

  @ApiProperty({ description: 'Filter by created date from', required: false })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @ApiProperty({ description: 'Filter by created date to', required: false })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @ApiProperty({ description: 'Filter by active disputes only', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean;

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

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdDate';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SubmitEvidenceDto {
  @ApiProperty({ description: 'Evidence title' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ description: 'Evidence description' })
  @IsString()
  @Length(10, 1000)
  description: string;

  @ApiProperty({ description: 'IPFS hash of evidence file' })
  @IsString()
  @Length(1, 100)
  evidenceHash: string;

  @ApiProperty({ description: 'Evidence file type' })
  @IsString()
  @Length(1, 50)
  fileType: string;

  @ApiProperty({ description: 'Evidence file size in bytes' })
  @IsNumber()
  @Min(1)
  fileSize: number;
}

export class SubmitToKlerosDto {
  @ApiProperty({ description: 'Kleros court ID to use', default: 1 })
  @IsNumber()
  @Min(1)
  klerosCourtId: number;

  @ApiProperty({ description: 'Number of jurors requested', default: 3 })
  @IsNumber()
  @Min(1)
  @Max(15)
  numberOfJurors: number;

  @ApiProperty({ description: 'Arbitration fee to pay' })
  @IsNumber()
  @Min(0)
  arbitrationFee: number;

  @ApiProperty({ description: 'Additional metadata for Kleros', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ExecuteRulingDto {
  @ApiProperty({ description: 'Transaction hash for ruling execution' })
  @IsString()
  @Length(66, 66)
  executionTransactionHash: string;

  @ApiProperty({ description: 'Additional execution notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class AppealDisputeDto {
  @ApiProperty({ description: 'Reason for appeal' })
  @IsString()
  @Length(20, 1000)
  appealReason: string;

  @ApiProperty({ description: 'Additional evidence for appeal', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  additionalEvidenceHash?: string;

  @ApiProperty({ description: 'Appeal fee to pay' })
  @IsNumber()
  @Min(0)
  appealFee: number;
}

