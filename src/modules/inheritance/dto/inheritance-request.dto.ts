import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, VerificationSource } from '../entities/inheritance-request.entity';

export class CreateInheritanceRequestDto {
  @ApiProperty({ description: 'Associated inheritance ID' })
  @IsUUID()
  inheritanceId: string;

  @ApiProperty({ description: 'Address of the requester (heir)' })
  @IsEthereumAddress()
  requestedBy: string;

  @ApiProperty({ description: 'IPFS hash of death certificate', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deathCertificateHash?: string;

  @ApiProperty({ description: 'Death certificate reference number', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  deathCertificateRef?: string;

  @ApiProperty({ description: 'Date of death', required: false })
  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;

  @ApiProperty({ description: 'Additional evidence', required: false })
  @IsOptional()
  @IsObject()
  additionalEvidence?: any;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class ProcessInheritanceRequestDto {
  @ApiProperty({ description: 'Whether the request is approved' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ description: 'Address of the processor' })
  @IsEthereumAddress()
  processedBy: string;

  @ApiProperty({ description: 'Verification notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  verificationNotes?: string;

  @ApiProperty({ description: 'Oracle verification transaction hash', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 66)
  oracleVerificationTxHash?: string;
}

export class VerifyDeathDto {
  @ApiProperty({ description: 'Verification source' })
  @IsEnum(VerificationSource)
  source: VerificationSource;

  @ApiProperty({ description: 'Death certificate reference' })
  @IsString()
  @Length(1, 100)
  certificateRef: string;

  @ApiProperty({ description: 'Date of death' })
  @IsDateString()
  dateOfDeath: string;

  @ApiProperty({ description: 'Verification details', required: false })
  @IsOptional()
  @IsObject()
  verificationDetails?: any;

  @ApiProperty({ description: 'Address of the verifier' })
  @IsEthereumAddress()
  verifiedBy: string;
}

export class InheritanceRequestFilterDto {
  @ApiProperty({ description: 'Filter by request status', enum: RequestStatus, required: false })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiProperty({ description: 'Filter by requester address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  requestedBy?: string;

  @ApiProperty({ description: 'Filter by inheritance ID', required: false })
  @IsOptional()
  @IsUUID()
  inheritanceId?: string;

  @ApiProperty({ description: 'Filter by land parcel ID', required: false })
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiProperty({ description: 'Filter by request date from', required: false })
  @IsOptional()
  @IsDateString()
  requestDateFrom?: string;

  @ApiProperty({ description: 'Filter by request date to', required: false })
  @IsOptional()
  @IsDateString()
  requestDateTo?: string;

  @ApiProperty({ description: 'Filter by verification status', required: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
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
