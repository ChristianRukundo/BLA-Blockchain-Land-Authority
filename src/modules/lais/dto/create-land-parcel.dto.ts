import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Length,
  IsEthereumAddress,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LandUseType, ComplianceStatus, ExpropriationStatus } from '../entities/land-parcel.entity';

class CoordinatesDto {
  @ApiProperty({ description: 'Longitude', example: 30.0619 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Latitude', example: -1.9441 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
}

class GeoJsonGeometryDto {
  @ApiProperty({ description: 'Geometry type', example: 'Polygon' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Coordinates array', type: 'array' })
  @IsArray()
  coordinates: number[][][];
}

class GeoJsonDto {
  @ApiProperty({ description: 'GeoJSON type', example: 'Feature' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Geometry object', type: GeoJsonGeometryDto })
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry: GeoJsonGeometryDto;

  @ApiProperty({ description: 'Properties object', required: false })
  @IsOptional()
  @IsObject()
  properties?: any;
}

export class CreateLandParcelDto {
  @ApiProperty({ description: 'Unique Parcel Identifier', example: 'RW-KIG-GAS-KIM-001' })
  @IsString()
  @Length(5, 100)
  upi: string;

  @ApiProperty({ description: 'Owner wallet address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  ownerAddress: string;

  @ApiProperty({ description: 'Land use type', enum: LandUseType, example: LandUseType.RESIDENTIAL })
  @IsEnum(LandUseType)
  landUse: LandUseType;

  @ApiProperty({ description: 'Province', example: 'Kigali City' })
  @IsString()
  @Length(1, 100)
  province: string;

  @ApiProperty({ description: 'District', example: 'Gasabo' })
  @IsString()
  @Length(1, 100)
  district: string;

  @ApiProperty({ description: 'Sector', example: 'Kimironko' })
  @IsString()
  @Length(1, 100)
  sector: string;

  @ApiProperty({ description: 'Cell', example: 'Bibare' })
  @IsString()
  @Length(1, 100)
  cell: string;

  @ApiProperty({ description: 'Village', example: 'Kabuga' })
  @IsString()
  @Length(1, 100)
  village: string;

  @ApiProperty({ description: 'Area in square meters', example: 1500.50 })
  @IsNumber()
  @Min(1)
  @Max(1000000000) // 1 billion square meters max
  area: number;

  @ApiProperty({ description: 'Perimeter in meters', required: false, example: 200.75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perimeter?: number;

  @ApiProperty({ description: 'Parcel centroid coordinates', type: CoordinatesDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @ApiProperty({ description: 'GeoJSON boundary data', type: GeoJsonDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonDto)
  geoJson?: GeoJsonDto;

  @ApiProperty({ description: 'Elevation above sea level in meters', required: false, example: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(-500)
  @Max(10000)
  elevation?: number;

  @ApiProperty({ description: 'Slope percentage', required: false, example: 15.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  slope?: number;

  @ApiProperty({ description: 'Soil type', required: false, example: 'Clay loam' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  soilType?: string;

  @ApiProperty({ 
    description: 'Compliance status', 
    enum: ComplianceStatus, 
    required: false,
    default: ComplianceStatus.PENDING_ASSESSMENT 
  })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  complianceStatus?: ComplianceStatus;

  @ApiProperty({ 
    description: 'Expropriation status', 
    enum: ExpropriationStatus, 
    required: false,
    default: ExpropriationStatus.NOT_FLAGGED 
  })
  @IsOptional()
  @IsEnum(ExpropriationStatus)
  expropriationStatus?: ExpropriationStatus;

  @ApiProperty({ description: 'Nominated heir wallet address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  nominatedHeir?: string;

  @ApiProperty({ description: 'IPFS hash of parcel metadata', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  metadataHash?: string;

  @ApiProperty({ description: 'IPFS hash of title deed document', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  titleDeedHash?: string;

  @ApiProperty({ description: 'IPFS hash of survey report', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  surveyReportHash?: string;

  @ApiProperty({ description: 'Market value in RWF', required: false, example: 50000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @ApiProperty({ description: 'Tax assessment value in RWF', required: false, example: 45000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxValue?: number;

  @ApiProperty({ description: 'Annual property tax in RWF', required: false, example: 450000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualTax?: number;

  @ApiProperty({ description: 'Whether the parcel is under dispute', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  underDispute?: boolean;

  @ApiProperty({ description: 'Whether the parcel is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ description: 'Data source', required: false, default: 'LAIS' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  dataSource?: string;

  @ApiProperty({ description: 'Data quality score (0-100)', required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  dataQuality?: number;

  @ApiProperty({ description: 'Blockchain token ID', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  tokenId?: number;
}

