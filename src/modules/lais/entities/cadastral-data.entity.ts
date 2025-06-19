import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LandParcel } from './land-parcel.entity';

export enum CadastralDataType {
  SURVEY_PLAN = 'SURVEY_PLAN',
  TITLE_DEED = 'TITLE_DEED',
  BOUNDARY_SURVEY = 'BOUNDARY_SURVEY',
  TOPOGRAPHIC_MAP = 'TOPOGRAPHIC_MAP',
  AERIAL_PHOTO = 'AERIAL_PHOTO',
  SATELLITE_IMAGE = 'SATELLITE_IMAGE',
  LEGAL_DESCRIPTION = 'LEGAL_DESCRIPTION',
  ZONING_MAP = 'ZONING_MAP',
}

export enum DataSource {
  RLMUA = 'RLMUA',
  MINAGRI = 'MINAGRI',
  SURVEY_DEPARTMENT = 'SURVEY_DEPARTMENT',
  SATELLITE_PROVIDER = 'SATELLITE_PROVIDER',
  FIELD_SURVEY = 'FIELD_SURVEY',
  HISTORICAL_RECORDS = 'HISTORICAL_RECORDS',
  THIRD_PARTY = 'THIRD_PARTY',
}

export enum DataQuality {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNVERIFIED = 'UNVERIFIED',
}

@Entity('cadastral_data')
@Index(['landParcelId'])
@Index(['dataType'])
@Index(['dataSource'])
@Index(['createdAt'])
export class CadastralData {
  @ApiProperty({ description: 'Unique identifier for the cadastral data record' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated land parcel ID' })
  @Column({ name: 'land_parcel_id', type: 'uuid' })
  landParcelId: string;

  @ApiProperty({ description: 'Type of cadastral data', enum: CadastralDataType })
  @Column({
    name: 'data_type',
    type: 'enum',
    enum: CadastralDataType,
  })
  dataType: CadastralDataType;

  @ApiProperty({ description: 'Source of the data', enum: DataSource })
  @Column({
    name: 'data_source',
    type: 'enum',
    enum: DataSource,
  })
  dataSource: DataSource;

  @ApiProperty({ description: 'Quality assessment of the data', enum: DataQuality })
  @Column({
    name: 'data_quality',
    type: 'enum',
    enum: DataQuality,
    default: DataQuality.UNVERIFIED,
  })
  dataQuality: DataQuality;

  @ApiProperty({ description: 'Title or name of the cadastral data' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Detailed description of the cadastral data' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'File URL or IPFS hash for the data' })
  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string;

  @ApiProperty({ description: 'IPFS hash for decentralized storage' })
  @Column({ name: 'ipfs_hash', type: 'varchar', length: 100, nullable: true })
  ipfsHash?: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @ApiProperty({ description: 'MIME type of the file' })
  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @ApiProperty({ description: 'Survey date for the data' })
  @Column({ name: 'survey_date', type: 'date', nullable: true })
  surveyDate?: Date;

  @ApiProperty({ description: 'Surveyor or organization responsible' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  surveyor?: string;

  @ApiProperty({ description: 'Survey reference number' })
  @Column({ name: 'survey_reference', type: 'varchar', length: 100, nullable: true })
  surveyReference?: string;

  @ApiProperty({ description: 'Accuracy of the survey in meters' })
  @Column({ name: 'accuracy_meters', type: 'decimal', precision: 10, scale: 3, nullable: true })
  accuracyMeters?: number;

  @ApiProperty({ description: 'Coordinate system used' })
  @Column({ name: 'coordinate_system', type: 'varchar', length: 100, nullable: true })
  coordinateSystem?: string;

  @ApiProperty({ description: 'Scale of the survey or map' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  scale?: string;

  @ApiProperty({ description: 'Version number of the data' })
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @ApiProperty({ description: 'Whether this is the current/active version' })
  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent: boolean;

  @ApiProperty({ description: 'Data verification status' })
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @ApiProperty({ description: 'Date when data was verified' })
  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Who verified the data' })
  @Column({ name: 'verified_by', type: 'varchar', length: 255, nullable: true })
  verifiedBy?: string;

  @ApiProperty({ description: 'Additional metadata as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Notes or comments about the data' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Data creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Data last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => LandParcel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'land_parcel_id' })
  landParcel: LandParcel;

  // Virtual properties
  get isHistorical(): boolean {
    return !this.isCurrent;
  }

  get ageInDays(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get isRecent(): boolean {
    return this.ageInDays <= 30; // Consider data recent if less than 30 days old
  }

  get needsVerification(): boolean {
    return !this.isVerified && this.dataQuality !== DataQuality.UNVERIFIED;
  }
}
