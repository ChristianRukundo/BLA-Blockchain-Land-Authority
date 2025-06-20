import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ExpropriationStatus } from '../entities/expropriation.entity';

export class CreateExpropriationDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsString()
  parcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @IsString()
  currentOwnerAddress: string;

  @ApiProperty({ description: 'Expropriating authority' })
  @IsString()
  expropriatingAuthority: string;

  @ApiProperty({ description: 'Title of the expropriation' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Reason for expropriation' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Legal basis for expropriation' })
  @IsString()
  legalBasis: string;

  @ApiProperty({ description: 'Proposed compensation amount' })
  @IsNumber()
  @Min(0)
  proposedCompensation: number;

  @ApiProperty({ description: 'Date when parcel was flagged' })
  @IsDateString()
  flaggedDate: string;

  @ApiPropertyOptional({ description: 'IPFS hash of reason document' })
  @IsOptional()
  @IsString()
  reasonDocumentHash?: string;

  @ApiPropertyOptional({ description: 'Reason document content' })
  @IsOptional()
  reasonDocument?: any;

  @ApiPropertyOptional({ description: 'Timeline for expropriation process' })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({ description: 'Contact information' })
  @IsOptional()
  @IsString()
  contactInformation?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExpropriationDto {
  @ApiPropertyOptional({ description: 'Expropriation status', enum: ExpropriationStatus })
  @IsOptional()
  @IsEnum(ExpropriationStatus)
  status?: ExpropriationStatus;

  @ApiPropertyOptional({ description: 'Title of the expropriation' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Reason for expropriation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Legal basis for expropriation' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional({ description: 'Proposed compensation amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proposedCompensation?: number;

  @ApiPropertyOptional({ description: 'Actual compensation amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCompensation?: number;

  @ApiPropertyOptional({ description: 'Date when parcel was flagged' })
  @IsOptional()
  @IsDateString()
  flaggedDate?: string;

  @ApiPropertyOptional({ description: 'Date when compensation was deposited' })
  @IsOptional()
  @IsDateString()
  compensationDepositedDate?: string;

  @ApiPropertyOptional({ description: 'Date when compensation was claimed' })
  @IsOptional()
  @IsDateString()
  compensationClaimedDate?: string;

  @ApiPropertyOptional({ description: 'Date when expropriation was completed' })
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiPropertyOptional({ description: 'New owner address after completion' })
  @IsOptional()
  @IsString()
  newOwnerAddress?: string;

  @ApiPropertyOptional({ description: 'Flag transaction hash' })
  @IsOptional()
  @IsString()
  flagTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Deposit transaction hash' })
  @IsOptional()
  @IsString()
  depositTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Claim transaction hash' })
  @IsOptional()
  @IsString()
  claimTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Completion transaction hash' })
  @IsOptional()
  @IsString()
  completionTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Timeline for expropriation process' })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({ description: 'Contact information' })
  @IsOptional()
  @IsString()
  contactInformation?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExpropriationFilterDto {
  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsString()
  parcelId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ExpropriationStatus })
  @IsOptional()
  @IsEnum(ExpropriationStatus)
  status?: ExpropriationStatus;

  @ApiPropertyOptional({ description: 'Filter by expropriating authority' })
  @IsOptional()
  @IsString()
  expropriatingAuthority?: string;

  @ApiPropertyOptional({ description: 'Filter by current owner address' })
  @IsOptional()
  @IsString()
  currentOwnerAddress?: string;

  @ApiPropertyOptional({ description: 'Filter from flagged date' })
  @IsOptional()
  @IsDateString()
  flaggedDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to flagged date' })
  @IsOptional()
  @IsDateString()
  flaggedDateTo?: string;

  @ApiPropertyOptional({ description: 'Show only active expropriations' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only expropriations pending compensation' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  pendingCompensation?: boolean;

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

  @ApiPropertyOptional({ description: 'Sort by field', default: 'flaggedDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'flaggedDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class DepositCompensationDto {
  @ApiProperty({ description: 'Compensation amount to deposit' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Transaction hash of the deposit' })
  @IsString()
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClaimCompensationDto {
  @ApiProperty({ description: 'Address of the claimer' })
  @IsString()
  claimerAddress: string;
  @ApiProperty({ description: 'Transaction hash of the claim' })
  @IsString()
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteExpropriationDto {
  @ApiProperty({ description: 'New owner address' })
  @IsString()
  newOwnerAddress: string;

  @ApiProperty({ description: 'Transaction hash of the completion' })
  @IsString()
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

