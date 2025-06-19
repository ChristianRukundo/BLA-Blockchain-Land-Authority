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
  Length,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InheritanceStatus, VerificationSource } from '../entities/inheritance-request.entity';

export class CreateInheritanceRequestDto {
  @ApiProperty({ description: 'Land parcel ID', example: 'uuid' })
  @IsUUID()
  parcelId: string;

  @ApiProperty({ description: 'Original owner address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  ownerAddress: string;

  @ApiProperty({ description: 'Designated heir address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  heirAddress: string;

  @ApiProperty({ description: 'Date when inheritance was requested', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  requestDate: string;

  @ApiProperty({ description: 'Death certificate reference', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deathCertificateRef?: string;

  @ApiProperty({ description: 'Date of death', required: false })
  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;

  @ApiProperty({ description: 'IPFS hash of supporting documents', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentsHash?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ description: 'Whether manual verification is required', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresManualVerification?: boolean;
}

export class UpdateInheritanceRequestDto {
  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus, required: false })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiProperty({ description: 'Chainlink request ID', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  chainlinkRequestId?: string;

  @ApiProperty({ description: 'Verification source', enum: VerificationSource, required: false })
  @IsOptional()
  @IsEnum(VerificationSource)
  verificationSource?: VerificationSource;

  @ApiProperty({ description: 'Death certificate reference', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deathCertificateRef?: string;

  @ApiProperty({ description: 'Date of death', required: false })
  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;

  @ApiProperty({ description: 'IPFS hash of supporting documents', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentsHash?: string;

  @ApiProperty({ description: 'Oracle verification response data', required: false })
  @IsOptional()
  @IsObject()
  verificationData?: any;

  @ApiProperty({ description: 'Transaction hash for inheritance transfer', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  transferTransactionHash?: string;

  @ApiProperty({ description: 'Reason for rejection or cancellation', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  rejectionReason?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ description: 'Whether manual verification is required', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresManualVerification?: boolean;

  @ApiProperty({ description: 'Dispute ID if inheritance is disputed', required: false })
  @IsOptional()
  @IsUUID()
  disputeId?: string;
}

export class InheritanceRequestFilterDto {
  @ApiProperty({ description: 'Filter by parcel ID', required: false })
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiProperty({ description: 'Filter by owner address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  ownerAddress?: string;

  @ApiProperty({ description: 'Filter by heir address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  heirAddress?: string;

  @ApiProperty({ description: 'Filter by status', enum: InheritanceStatus, required: false })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiProperty({ description: 'Filter by verification source', enum: VerificationSource, required: false })
  @IsOptional()
  @IsEnum(VerificationSource)
  verificationSource?: VerificationSource;

  @ApiProperty({ description: 'Filter by request date from', required: false })
  @IsOptional()
  @IsDateString()
  requestDateFrom?: string;

  @ApiProperty({ description: 'Filter by request date to', required: false })
  @IsOptional()
  @IsDateString()
  requestDateTo?: string;

  @ApiProperty({ description: 'Filter by manual verification requirement', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresManualVerification?: boolean;

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

  @ApiProperty({ description: 'Sort field', required: false, default: 'requestDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'requestDate';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class VerifyDeathDto {
  @ApiProperty({ description: 'Death certificate reference' })
  @IsString()
  @Length(1, 100)
  deathCertificateRef: string;

  @ApiProperty({ description: 'Date of death' })
  @IsDateString()
  dateOfDeath: string;

  @ApiProperty({ description: 'Verification source', enum: VerificationSource })
  @IsEnum(VerificationSource)
  verificationSource: VerificationSource;

  @ApiProperty({ description: 'IPFS hash of supporting documents', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentsHash?: string;

  @ApiProperty({ description: 'Additional verification data', required: false })
  @IsOptional()
  @IsObject()
  verificationData?: any;
}

export class ExecuteInheritanceDto {
  @ApiProperty({ description: 'Transaction hash for the inheritance transfer' })
  @IsString()
  @Length(66, 66)
  transferTransactionHash: string;

  @ApiProperty({ description: 'Additional notes for the execution', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class InheritanceRequestResponseDto {
  @ApiProperty({ description: 'Request ID' })
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  parcelId: string;

  @ApiProperty({ description: 'Owner address' })
  ownerAddress: string;

  @ApiProperty({ description: 'Heir address' })
  heirAddress: string;

  @ApiProperty({ description: 'Request status', enum: InheritanceStatus })
  status: InheritanceStatus;

  @ApiProperty({ description: 'Request date' })
  requestDate: Date;

  @ApiProperty({ description: 'Death certificate reference', required: false })
  deathCertificateRef?: string;

  @ApiProperty({ description: 'Date of death', required: false })
  dateOfDeath?: Date;

  @ApiProperty({ description: 'Verification source', enum: VerificationSource, required: false })
  verificationSource?: VerificationSource;

  @ApiProperty({ description: 'Transaction hash', required: false })
  transferTransactionHash?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class InheritanceRequestListResponseDto {
  @ApiProperty({ description: 'List of inheritance requests', type: [InheritanceRequestResponseDto] })
  requests: InheritanceRequestResponseDto[];

  @ApiProperty({ description: 'Total number of requests matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}