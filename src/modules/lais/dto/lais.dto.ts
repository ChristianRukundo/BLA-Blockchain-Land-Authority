import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsObject,
  IsArray,
  IsUUID,
  Min,
  Max,
  Length,
  Matches,
  IsInt,
  IsEthereumAddress,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LandUseType, ComplianceStatus, ExpropriationStatus } from '../entities/land-parcel.entity';
import { CadastralDataType, DataSource, DataQuality } from '../entities/cadastral-data.entity';
import { ZoneType, ZoneStatus, PlanningAuthority } from '../entities/land-use-zone.entity';
import { override } from 'joi';

// Land Parcel DTOs
export class CreateLandParcelDto {
  @ApiProperty({ description: 'Unique Parcel Identifier (UPI)', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  upi?: string;

  @ApiProperty({ description: 'NFT Token ID', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  tokenId?: number;

  @ApiProperty({ description: 'Owner wallet address', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
  @Transform(({ value }) => value?.toLowerCase())
  ownerAddress?: string;

  @ApiProperty({ description: 'Land use type', enum: LandUseType })
  @IsEnum(LandUseType)
  landUse: LandUseType;

  @ApiProperty({ description: 'Parcel title or name' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ description: 'Detailed description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Physical address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'District' })
  @IsString()
  @Length(1, 100)
  district: string;

  @ApiProperty({ description: 'Sector' })
  @IsString()
  @Length(1, 100)
  sector: string;

  @ApiProperty({ description: 'Cell' })
  @IsString()
  @Length(1, 100)
  cell: string;

  @ApiProperty({ description: 'Village' })
  @IsString()
  @Length(1, 100)
  village: string;

  @ApiProperty({ description: 'Parcel geometry as GeoJSON' })
  @IsObject()
  geometry: any;

  @ApiProperty({ description: 'Location point as GeoJSON', required: false })
  @IsOptional()
  @IsObject()
  location?: any;

  @ApiProperty({ description: 'Area in square meters' })
  @IsNumber()
  @Min(0)
  areaSqm: number;

  @ApiProperty({ description: 'Perimeter in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimeter?: number;

  @ApiProperty({ description: 'Elevation in meters', required: false })
  @IsOptional()
  @IsNumber()
  elevation?: number;

  @ApiProperty({ description: 'Slope percentage', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  slope?: number;

  @ApiProperty({ description: 'Soil type', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  soilType?: string;

  @ApiProperty({ description: 'Water access availability', required: false })
  @IsOptional()
  @IsBoolean()
  waterAccess?: boolean;

  @ApiProperty({ description: 'Road access availability', required: false })
  @IsOptional()
  @IsBoolean()
  roadAccess?: boolean;

  @ApiProperty({ description: 'Electricity access availability', required: false })
  @IsOptional()
  @IsBoolean()
  electricityAccess?: boolean;

  @ApiProperty({ description: 'Market value in RWF', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @ApiProperty({ description: 'Tax assessment value in RWF', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxValue?: number;

  @ApiProperty({ description: 'Survey date', required: false })
  @IsOptional()
  @IsDateString()
  surveyDate?: string;

  @ApiProperty({ description: 'Surveyor name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  surveyor?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;


  @ApiPropertyOptional({ description: 'Nominated heir address for inheritance purposes', example: '0xabc...', nullable: true })
  @IsOptional()
  @IsEthereumAddress()
  @Transform(({ value }) => value ? value.toLowerCase() : null) // Handle null, convert to lowercase
  nominatedHeir?: string | null; // <<<< MAKE SURE THIS IS PRESENT AND CORRECTLY TYPED
}

export class UpdateLandParcelDto extends PartialType(CreateLandParcelDto) {
  
  @ApiPropertyOptional({ description: 'Compliance status of the parcel', enum: ComplianceStatus })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  complianceStatus?: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Expropriation status of the parcel', enum: ExpropriationStatus })
  @IsOptional()
  @IsEnum(ExpropriationStatus)
  expropriationStatus?: ExpropriationStatus;

  @ApiPropertyOptional({ description: 'Date of last compliance assessment' })
  @IsOptional()
  @IsDateString()
  lastAssessmentDate?: string;

  @ApiPropertyOptional({ description: 'Flag indicating if the parcel is currently under dispute' })
  @IsOptional()
  @IsBoolean()
  underDispute?: boolean;

  
}

// Cadastral Data DTOs
export class CreateCadastralDataDto {
  @ApiProperty({ description: 'Land parcel ID' })
  @IsUUID()
  landParcelId: string;

  @ApiProperty({ description: 'Data type', enum: CadastralDataType })
  @IsEnum(CadastralDataType)
  dataType: CadastralDataType;

  @ApiProperty({ description: 'Data source', enum: DataSource })
  @IsEnum(DataSource)
  dataSource: DataSource;

  @ApiProperty({ description: 'Data quality', enum: DataQuality, required: false })
  @IsOptional()
  @IsEnum(DataQuality)
  dataQuality?: DataQuality;

  @ApiProperty({ description: 'Title' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'File URL', required: false })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ description: 'IPFS hash', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  ipfsHash?: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;

  @ApiProperty({ description: 'MIME type', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  mimeType?: string;

  @ApiProperty({ description: 'Survey date', required: false })
  @IsOptional()
  @IsDateString()
  surveyDate?: string;

  @ApiProperty({ description: 'Surveyor', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  surveyor?: string;

  @ApiProperty({ description: 'Survey reference', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  surveyReference?: string;

  @ApiProperty({ description: 'Accuracy in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @ApiProperty({ description: 'Coordinate system', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  coordinateSystem?: string;

  @ApiProperty({ description: 'Scale', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  scale?: string;

  @ApiProperty({ description: 'Version', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  version?: string;

  @ApiProperty({ description: 'Is current version', required: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCadastralDataDto extends PartialType(CreateCadastralDataDto) {
 
  override landParcelId?: never;
}

// Land Use Zone DTOs
export class CreateLandUseZoneDto {
  @ApiProperty({ description: 'Zone name' })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: 'Zone code' })
  @IsString()
  @Length(1, 50)
  zoneCode: string;

  @ApiProperty({ description: 'Zone type', enum: ZoneType })
  @IsEnum(ZoneType)
  zoneType: ZoneType;

  @ApiProperty({ description: 'Zone status', enum: ZoneStatus, required: false })
  @IsOptional()
  @IsEnum(ZoneStatus)
  zoneStatus?: ZoneStatus;

  @ApiProperty({ description: 'Planning authority', enum: PlanningAuthority })
  @IsEnum(PlanningAuthority)
  planningAuthority: PlanningAuthority;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Zone geometry as GeoJSON' })
  @IsObject()
  geometry: any;

  @ApiProperty({ description: 'Area in square meters' })
  @IsNumber()
  @Min(0)
  areaSqm: number;

  @ApiProperty({ description: 'Perimeter in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimeter?: number;

  @ApiProperty({ description: 'Minimum lot size in square meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLotSize?: number;

  @ApiProperty({ description: 'Maximum lot size in square meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLotSize?: number;

  @ApiProperty({ description: 'Maximum building height in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBuildingHeight?: number;

  @ApiProperty({ description: 'Maximum floor area ratio', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxFAR?: number;

  @ApiProperty({ description: 'Front setback in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  frontSetback?: number;

  @ApiProperty({ description: 'Rear setback in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rearSetback?: number;

  @ApiProperty({ description: 'Side setback in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sideSetback?: number;

  @ApiProperty({ description: 'Maximum coverage percentage', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxCoverage?: number;

  @ApiProperty({ description: 'Minimum green space percentage', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minGreenSpace?: number;

  @ApiProperty({ description: 'Allowed uses', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUses?: string[];

  @ApiProperty({ description: 'Prohibited uses', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prohibitedUses?: string[];

  @ApiProperty({ description: 'Special conditions', required: false })
  @IsOptional()
  @IsObject()
  specialConditions?: Record<string, any>;

  @ApiProperty({ description: 'Effective date' })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ description: 'Expiry date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ description: 'Legal reference', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  legalReference?: string;

  @ApiProperty({ description: 'Documents IPFS hash', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentsIpfs?: string;

  @ApiProperty({ description: 'Priority level', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLandUseZoneDto extends PartialType(CreateLandUseZoneDto) {}

// Spatial Query DTOs
export class SpatialQueryDto {
  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Radius in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000) // Max 100km
  radiusMeters?: number;
}

export class BoundingBoxQueryDto {
  @ApiProperty({ description: 'Minimum longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng: number;

  @ApiProperty({ description: 'Minimum latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat: number;

  @ApiProperty({ description: 'Maximum longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng: number;

  @ApiProperty({ description: 'Maximum latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat: number;
}

export class GeometryQueryDto {
  @ApiProperty({ description: 'GeoJSON geometry for intersection query' })
  @IsObject()
  geometry: any;
}

// Response DTOs
export class LandParcelResponseDto {
  @ApiProperty({ description: 'Parcel ID' })
  id: string;

  @ApiProperty({ description: 'UPI', required: false })
  upi?: string;

  @ApiProperty({ description: 'Token ID', required: false })
  tokenId?: number;

  @ApiProperty({ description: 'Owner address', required: false })
  ownerAddress?: string;

  @ApiProperty({ description: 'Land use type', enum: LandUseType })
  landUse: LandUseType;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  complianceStatus: ComplianceStatus;

  @ApiProperty({ description: 'Expropriation status', enum: ExpropriationStatus })
  expropriationStatus: ExpropriationStatus;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Address' })
  address: string;

  @ApiProperty({ description: 'District' })
  district: string;

  @ApiProperty({ description: 'Sector' })
  sector: string;

  @ApiProperty({ description: 'Cell' })
  cell: string;

  @ApiProperty({ description: 'Village' })
  village: string;

  @ApiProperty({ description: 'Area in square meters' })
  areaSqm: number;

  @ApiProperty({ description: 'Area in hectares' })
  areaHectares: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class LandParcelListResponseDto {
  @ApiProperty({ description: 'List of land parcels', type: [LandParcelResponseDto] })
  parcels: LandParcelResponseDto[];

  @ApiProperty({ description: 'Total number of parcels' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of parcels per page' })
  limit: number;
}

export class LandParcelStatisticsDto {
  @ApiProperty({ description: 'Total number of parcels' })
  totalParcels: number;

  @ApiProperty({ description: 'Parcels by land use type' })
  parcelsByLandUse: Record<LandUseType, number>;

  @ApiProperty({ description: 'Parcels by compliance status' })
  parcelsByComplianceStatus: Record<ComplianceStatus, number>;

  @ApiProperty({ description: 'Parcels by expropriation status' })
  parcelsByExpropriationStatus: Record<ExpropriationStatus, number>;

  @ApiProperty({ description: 'Total area in square meters' })
  totalArea: number;

  @ApiProperty({ description: 'Average area in square meters' })
  averageArea: number;
}

export class CadastralDataStatisticsDto {
  @ApiProperty({ description: 'Total number of records' })
  totalRecords: number;

  @ApiProperty({ description: 'Records by type' })
  recordsByType: Record<CadastralDataType, number>;

  @ApiProperty({ description: 'Records by source' })
  recordsBySource: Record<DataSource, number>;

  @ApiProperty({ description: 'Records by quality' })
  recordsByQuality: Record<DataQuality, number>;

  @ApiProperty({ description: 'Number of verified records' })
  verifiedRecords: number;

  @ApiProperty({ description: 'Number of recent records (last 30 days)' })
  recentRecords: number;
}
