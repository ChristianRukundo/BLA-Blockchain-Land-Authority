import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsEthereumAddress,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InheritanceStatus } from '../entities/inheritance.entity';
import { RequestStatus } from '../entities/inheritance-request.entity';

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

  @ApiProperty({ description: 'Inheritance conditions', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  conditions?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class CreateInheritanceRequestDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsUUID()
  parcelId: string;

  @ApiProperty({ description: 'Requester wallet address' })
  @IsEthereumAddress()
  requestedBy: string;

  @ApiProperty({ description: 'Death certificate IPFS hash' })
  @IsString()
  @Length(0, 100)
  deathCertificateHash: string;

  @ApiProperty({ description: 'Additional supporting documents IPFS hash', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  supportingDocumentsHash?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateInheritanceDto {
  @ApiProperty({ description: 'Designated heir wallet address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  designatedHeir?: string;

  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus, required: false })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiProperty({ description: 'Inheritance conditions', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  conditions?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class ProcessInheritanceDto {
  @ApiProperty({ description: 'Transaction hash for completion' })
  @IsString()
  @Length(66, 66)
  transactionHash: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class ProcessInheritanceRequestDto {
  @ApiProperty({ description: 'Processor wallet address' })
  @IsEthereumAddress()
  processedBy: string;

  @ApiProperty({ description: 'Request status', enum: RequestStatus })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiProperty({ description: 'Verification notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  verificationNotes?: string;

  @ApiProperty({ description: 'Transaction hash for approval', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  transactionHash?: string;
}

export class CancelInheritanceDto {
  @ApiProperty({ description: 'Address of the canceller' })
  @IsEthereumAddress()
  cancelledBy: string;

  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @Length(10, 1000)
  reason: string;
}

export class InheritanceFilterDto {
  @ApiProperty({
    description: 'Filter by inheritance status',
    enum: InheritanceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(InheritanceStatus)
  status?: InheritanceStatus;

  @ApiProperty({ description: 'Filter by current owner address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  currentOwner?: string;

  @ApiProperty({ description: 'Filter by designated heir address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  designatedHeir?: string;

  @ApiProperty({ description: 'Filter by land parcel ID', required: false })
  @IsOptional()
  @IsUUID()
  landParcelId?: string;

  @ApiProperty({ description: 'Filter by creation date from', required: false })
  @IsOptional()
  @IsDateString()
  creationDateFrom?: string;

  @ApiProperty({ description: 'Filter by creation date to', required: false })
  @IsOptional()
  @IsDateString()
  creationDateTo?: string;

  @ApiProperty({ description: 'Filter by active inheritances only', required: false })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class InheritanceResponseDto {
  @ApiProperty({ description: 'Inheritance ID' })
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  landParcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  currentOwner: string;

  @ApiProperty({ description: 'Designated heir wallet address' })
  designatedHeir: string;

  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus })
  status: InheritanceStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Completion timestamp', required: false })
  completedAt?: Date;

  @ApiProperty({ description: 'Transfer transaction hash', required: false })
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

  @ApiProperty({ description: 'Associated inheritance ID' })
  inheritanceId: string;

  @ApiProperty({ description: 'Requester wallet address' })
  requestedBy: string;

  @ApiProperty({ description: 'Request status', enum: RequestStatus })
  status: RequestStatus;

  @ApiProperty({ description: 'Death certificate hash', required: false })
  deathCertificateHash?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Processing timestamp', required: false })
  processedAt?: Date;

  @ApiProperty({ description: 'Processor wallet address', required: false })
  processedBy?: string;

  @ApiProperty({ description: 'Verification notes', required: false })
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
  requestsByStatus: Record<RequestStatus, number>;

  @ApiProperty({ description: 'Average processing time in hours' })
  averageProcessingTimeHours: number;
}
