import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InheritanceStatus, VerificationSource } from '../entities/inheritance.entity';

export class CreateInheritanceRequestDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsString()
  parcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @IsString()
  currentOwnerAddress: string;

  @ApiProperty({ description: 'Heir wallet address' })
  @IsString()
  heirAddress: string;

  @ApiProperty({ description: 'Request date' })
  @IsDateString()
  requestDate: string;

  @ApiPropertyOptional({ description: 'Evidence hash from IPFS' })
  @IsOptional()
  @IsString()
  evidenceHash?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInheritanceRequestDto {
  @ApiPropertyOptional({ description: 'On-chain request ID' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ description: 'Inheritance status', enum: InheritanceStatus })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiPropertyOptional({ description: 'Request date' })
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiPropertyOptional({ description: 'Evidence hash from IPFS' })
  @IsOptional()
  @IsString()
  evidenceHash?: string;

  @ApiPropertyOptional({ description: 'Whether death has been verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Verification source', enum: VerificationSource })
  @IsOptional()
  @IsEnum(VerificationSource)
  verificationSource?: VerificationSource;

  @ApiPropertyOptional({ description: 'Verification details' })
  @IsOptional()
  @IsString()
  verificationDetails?: string;

  @ApiPropertyOptional({ description: 'Verification date' })
  @IsOptional()
  @IsDateString()
  verificationDate?: string;

  @ApiPropertyOptional({ description: 'Processing date' })
  @IsOptional()
  @IsDateString()
  processedDate?: string;

  @ApiPropertyOptional({ description: 'Execution transaction hash' })
  @IsOptional()
  @IsString()
  executionTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Oracle request ID' })
  @IsOptional()
  @IsString()
  oracleRequestId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InheritanceRequestFilterDto {
  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsString()
  parcelId?: string;

  @ApiPropertyOptional({ description: 'Filter by current owner address' })
  @IsOptional()
  @IsString()
  currentOwnerAddress?: string;

  @ApiPropertyOptional({ description: 'Filter by heir address' })
  @IsOptional()
  @IsString()
  heirAddress?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: InheritanceStatus })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiPropertyOptional({ description: 'Filter by verification source', enum: VerificationSource })
  @IsOptional()
  @IsEnum(VerificationSource)
  verificationSource?: VerificationSource;

  @ApiPropertyOptional({ description: 'Filter from request date' })
  @IsOptional()
  @IsDateString()
  requestDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to request date' })
  @IsOptional()
  @IsDateString()
  requestDateTo?: string;

  @ApiPropertyOptional({ description: 'Show only pending requests' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  pendingOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only verified requests' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'requestDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'requestDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class VerifyDeathDto {
  @ApiProperty({ description: 'Whether the person is deceased' })
  @IsBoolean()
  isDeceased: boolean;

  @ApiProperty({ description: 'Verification source', enum: VerificationSource })
  @IsEnum(VerificationSource)
  verificationSource: VerificationSource;

  @ApiPropertyOptional({ description: 'Verification details' })
  @IsOptional()
  @IsString()
  verificationDetails?: string;
}

export class ProcessInheritanceDto {
  @ApiProperty({ description: 'Execution transaction hash' })
  @IsString()
  executionTransactionHash: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

