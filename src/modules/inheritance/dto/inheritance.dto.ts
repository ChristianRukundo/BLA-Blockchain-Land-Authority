import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsUUID,
  IsEthereumAddress,
  IsNumber,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { InheritanceStatus, VerificationSource } from '../entities/inheritance.entity';

export class CreateInheritanceDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsUUID()
  landParcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @IsEthereumAddress()
  currentOwner: string;

  @ApiProperty({ description: 'Designated heir wallet address' })
  @IsEthereumAddress()
  designatedHeir: string;

  @ApiPropertyOptional({ description: 'Inheritance conditions' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  conditions?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class UpdateInheritanceDto {
  @ApiPropertyOptional({ description: 'Designated heir wallet address' })
  @IsOptional()
  @IsEthereumAddress()
  designatedHeir?: string;

  @ApiPropertyOptional({ description: 'Inheritance conditions' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  conditions?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class CreateInheritanceRequestDto {
  @ApiProperty({ description: 'Inheritance ID' })
  @IsUUID()
  inheritanceId: string;

  @ApiProperty({ description: 'Requested by (heir address)' })
  @IsEthereumAddress()
  requestedBy: string;

  @ApiPropertyOptional({ description: 'Death certificate hash from IPFS' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  deathCertificateHash?: string;

  @ApiPropertyOptional({ description: 'Additional evidence hash from IPFS' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  additionalEvidence?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class ProcessInheritanceRequestDto {
  @ApiProperty({ description: 'Whether the request is approved' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ description: 'Processed by (admin address)' })
  @IsEthereumAddress()
  processedBy: string;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'Oracle verification transaction hash' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  oracleVerificationTxHash?: string;
}

export class InheritanceFilterDto {
  @ApiPropertyOptional({ description: 'Filter by land parcel ID' })
  @IsOptional()
  @IsUUID()
  landParcelId?: string;

  @ApiPropertyOptional({ description: 'Filter by current owner address' })
  @IsOptional()
  @IsEthereumAddress()
  currentOwner?: string;

  @ApiPropertyOptional({ description: 'Filter by designated heir address' })
  @IsOptional()
  @IsEthereumAddress()
  designatedHeir?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: InheritanceStatus })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiPropertyOptional({ description: 'Filter from created date' })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to created date' })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @ApiPropertyOptional({ description: 'Show only active inheritances' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class InheritanceRequestFilterDto {
  @ApiPropertyOptional({ description: 'Filter by inheritance ID' })
  @IsOptional()
  @IsUUID()
  inheritanceId?: string;

  @ApiPropertyOptional({ description: 'Filter by requested by (heir address)' })
  @IsOptional()
  @IsEthereumAddress()
  requestedBy?: string;

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
  @Transform(({ value }) => value === 'true' || value === true)
  pendingOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only verified requests' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
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
  @Length(0, 1000)
  verificationDetails?: string;

  @ApiPropertyOptional({ description: 'Death certificate reference' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  deathCertificateRef?: string;

  @ApiPropertyOptional({ description: 'Date of death' })
  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;
}

export class ProcessInheritanceDto {
  @ApiProperty({ description: 'Execution transaction hash' })
  @IsString()
  @Length(66, 66)
  executionTransactionHash: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class CancelInheritanceDto {
  @ApiProperty({ description: 'Cancelled by address' })
  @IsEthereumAddress()
  cancelledBy: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  @Length(10, 1000)
  reason: string;
}

export class InheritanceResponseDto {
  @ApiProperty({ description: 'Inheritance ID' })
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  landParcelId: string;

  @ApiProperty({ description: 'Current owner address' })
  currentOwner: string;

  @ApiProperty({ description: 'Designated heir address' })
  designatedHeir: string;

  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus })
  status: InheritanceStatus;

  @ApiPropertyOptional({ description: 'Inheritance conditions' })
  conditions?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Transfer transaction hash' })
  transferTxHash?: string;
}

export class InheritanceListResponseDto {
  @ApiProperty({ description: 'List of inheritances', type: [InheritanceResponseDto] })
  inheritances: InheritanceResponseDto[];

  @ApiProperty({ description: 'Total number of inheritances matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}

export class InheritanceRequestResponseDto {
  @ApiProperty({ description: 'Request ID' })
  id: string;

  @ApiProperty({ description: 'Inheritance ID' })
  inheritanceId: string;

  @ApiProperty({ description: 'Requested by (heir address)' })
  requestedBy: string;

  @ApiProperty({ description: 'Request status', enum: InheritanceStatus })
  status: InheritanceStatus;

  @ApiPropertyOptional({ description: 'Death certificate hash' })
  deathCertificateHash?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Processing timestamp' })
  processedAt?: Date;

  @ApiPropertyOptional({ description: 'Processed by address' })
  processedBy?: string;

  @ApiPropertyOptional({ description: 'Verification notes' })
  verificationNotes?: string;
}

export class InheritanceRequestListResponseDto {
  @ApiProperty({
    description: 'List of inheritance requests',
    type: [InheritanceRequestResponseDto],
  })
  requests: InheritanceRequestResponseDto[];

  @ApiProperty({ description: 'Total number of requests matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}

export class InheritanceStatisticsDto {
  @ApiProperty({ description: 'Total number of inheritances' })
  totalInheritances: number;

  @ApiProperty({ description: 'Total number of inheritance requests' })
  totalRequests: number;

  @ApiProperty({ description: 'Inheritances by status' })
  inheritancesByStatus: Record<InheritanceStatus, number>;

  @ApiProperty({ description: 'Requests by status' })
  requestsByStatus: Record<string, number>;

  @ApiProperty({ description: 'Average processing time in hours' })
  averageProcessingTimeHours: number;
}
