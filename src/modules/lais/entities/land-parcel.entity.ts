import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Point,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum LandUseType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  AGRICULTURAL = 'AGRICULTURAL',
  INDUSTRIAL = 'INDUSTRIAL',
  CONSERVATION = 'CONSERVATION',
  RECREATIONAL = 'RECREATIONAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
  MIXED_USE = 'MIXED_USE',
  UNDEVELOPED = 'UNDEVELOPED',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_ASSESSMENT = 'PENDING_ASSESSMENT',
  EXEMPTED = 'EXEMPTED',
}

export enum ExpropriationStatus {
  NOT_FLAGGED = 'NOT_FLAGGED',
  FLAGGED = 'FLAGGED',
  FUNDS_DEPOSITED = 'FUNDS_DEPOSITED',
  COMPENSATION_CLAIMED = 'COMPENSATION_CLAIMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('land_parcels')
@Index(['tokenId'], { unique: true })
@Index(['upi'], { unique: true })
@Index(['ownerAddress'])
@Index(['landUse'])
@Index(['complianceStatus'])
@Index(['expropriationStatus'])
@Index(['location'], { spatial: true })
export class LandParcel {
  @ApiProperty({ description: 'Unique identifier for the land parcel record' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Blockchain token ID' })
  @Column({ type: 'bigint', unique: true, nullable: true })
  tokenId: number;

  @ApiProperty({ description: 'Unique Parcel Identifier' })
  @Column({ type: 'varchar', length: 100, unique: true })
  upi: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @Column({ type: 'varchar', length: 42 })
  ownerAddress: string;

  @ApiProperty({ description: 'Land use classification', enum: LandUseType })
  @Column({ type: 'enum', enum: LandUseType })
  landUse: LandUseType;

  @ApiProperty({ description: 'Province where the parcel is located' })
  @Column({ type: 'varchar', length: 100 })
  province: string;

  @ApiProperty({ description: 'District where the parcel is located' })
  @Column({ type: 'varchar', length: 100 })
  district: string;

  @ApiProperty({ description: 'Sector where the parcel is located' })
  @Column({ type: 'varchar', length: 100 })
  sector: string;

  @ApiProperty({ description: 'Cell where the parcel is located' })
  @Column({ type: 'varchar', length: 100 })
  cell: string;

  @ApiProperty({ description: 'Village where the parcel is located' })
  @Column({ type: 'varchar', length: 100 })
  village: string;

  @ApiProperty({ description: 'Area of the parcel in square meters' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  area: number;

  @ApiProperty({ description: 'Perimeter of the parcel in meters' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  perimeter: number;

  @ApiProperty({ description: 'PostGIS geometry point for the parcel centroid' })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;

  @ApiProperty({ description: 'PostGIS geometry polygon for the parcel boundary' })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  boundary: any;

  @ApiProperty({ description: 'GeoJSON representation of the parcel boundary' })
  @Column({ type: 'jsonb', nullable: true })
  geoJson: any;

  @ApiProperty({ description: 'Elevation above sea level in meters' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  elevation: number;

  @ApiProperty({ description: 'Slope percentage' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  slope: number;

  @ApiProperty({ description: 'Soil type classification' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  soilType: string;

  @ApiProperty({ description: 'Current compliance status', enum: ComplianceStatus })
  @Column({ type: 'enum', enum: ComplianceStatus, default: ComplianceStatus.PENDING_ASSESSMENT })
  complianceStatus: ComplianceStatus;

  @ApiProperty({ description: 'Last compliance assessment date' })
  @Column({ type: 'timestamp', nullable: true })
  lastAssessmentDate: Date;

  @ApiProperty({ description: 'IPFS hash of the last compliance report' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  lastComplianceReport: string;

  @ApiProperty({ description: 'Current expropriation status', enum: ExpropriationStatus })
  @Column({ type: 'enum', enum: ExpropriationStatus, default: ExpropriationStatus.NOT_FLAGGED })
  expropriationStatus: ExpropriationStatus;

  @ApiProperty({ description: 'Nominated heir wallet address' })
  @Column({ type: 'varchar', length: 42, nullable: true })
  nominatedHeir: string;

  @ApiProperty({ description: 'IPFS hash of parcel metadata' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  metadataHash: string;

  @ApiProperty({ description: 'IPFS hash of title deed document' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  titleDeedHash: string;

  @ApiProperty({ description: 'IPFS hash of survey report' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  surveyReportHash: string;

  @ApiProperty({ description: 'Market value in RWF' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  marketValue: number;

  @ApiProperty({ description: 'Tax assessment value in RWF' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  taxValue: number;

  @ApiProperty({ description: 'Annual property tax in RWF' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  annualTax: number;

  @ApiProperty({ description: 'Whether the parcel is currently under dispute' })
  @Column({ type: 'boolean', default: false })
  underDispute: boolean;

  @ApiProperty({ description: 'Whether the parcel is active in the system' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional notes about the parcel' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ description: 'Source of the parcel data' })
  @Column({ type: 'varchar', length: 100, default: 'LAIS' })
  dataSource: string;

  @ApiProperty({ description: 'Data quality score (0-100)' })
  @Column({ type: 'integer', default: 100 })
  dataQuality: number;

  @ApiProperty({ description: 'Last verification date' })
  @Column({ type: 'timestamp', nullable: true })
  lastVerificationDate: Date;

  @ApiProperty({ description: 'Verification status' })
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties for computed values
  get coordinates(): [number, number] | null {
    if (this.location && this.location.coordinates) {
      return [this.location.coordinates[0], this.location.coordinates[1]];
    }
    return null;
  }

  get formattedArea(): string {
    if (this.area >= 10000) {
      return `${(this.area / 10000).toFixed(2)} ha`;
    }
    return `${this.area.toFixed(2)} m²`;
  }

  get fullAddress(): string {
    return [this.village, this.cell, this.sector, this.district, this.province]
      .filter(Boolean)
      .join(', ');
  }

  get isCompliant(): boolean {
    return this.complianceStatus === ComplianceStatus.COMPLIANT;
  }

  get isExpropriated(): boolean {
    return [
      ExpropriationStatus.FLAGGED,
      ExpropriationStatus.FUNDS_DEPOSITED,
      ExpropriationStatus.COMPENSATION_CLAIMED,
      ExpropriationStatus.COMPLETED,
    ].includes(this.expropriationStatus);
  }
}

