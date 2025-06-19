import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Geometry } from 'geojson';

export enum ZoneType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  AGRICULTURAL = 'AGRICULTURAL',
  CONSERVATION = 'CONSERVATION',
  RECREATIONAL = 'RECREATIONAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
  MIXED_USE = 'MIXED_USE',
  SPECIAL_ECONOMIC = 'SPECIAL_ECONOMIC',
  BUFFER_ZONE = 'BUFFER_ZONE',
  WETLAND = 'WETLAND',
  FOREST = 'FOREST',
  URBAN = 'URBAN',
  RURAL = 'RURAL',
}

export enum ZoneStatus {
  ACTIVE = 'ACTIVE',
  PROPOSED = 'PROPOSED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export enum PlanningAuthority {
  RLMUA = 'RLMUA',
  MINAGRI = 'MINAGRI',
  MININFRA = 'MININFRA',
  DISTRICT = 'DISTRICT',
  SECTOR = 'SECTOR',
  CELL = 'CELL',
  VILLAGE = 'VILLAGE',
  NATIONAL = 'NATIONAL',
}

@Entity('land_use_zones')
@Index(['zoneType'])
@Index(['zoneStatus'])
@Index(['planningAuthority'])
@Index(['effectiveDate'])
@Index(['geometry'], { spatial: true })
export class LandUseZone {
  @ApiProperty({ description: 'Unique identifier for the land use zone' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Zone name or identifier' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: 'Zone code or reference number' })
  @Column({ name: 'zone_code', type: 'varchar', length: 50, unique: true })
  zoneCode: string;

  @ApiProperty({ description: 'Type of land use zone', enum: ZoneType })
  @Column({
    name: 'zone_type',
    type: 'enum',
    enum: ZoneType,
  })
  zoneType: ZoneType;

  @ApiProperty({ description: 'Current status of the zone', enum: ZoneStatus })
  @Column({
    name: 'zone_status',
    type: 'enum',
    enum: ZoneStatus,
    default: ZoneStatus.PROPOSED,
  })
  zoneStatus: ZoneStatus;

  @ApiProperty({ description: 'Planning authority responsible', enum: PlanningAuthority })
  @Column({
    name: 'planning_authority',
    type: 'enum',
    enum: PlanningAuthority,
  })
  planningAuthority: PlanningAuthority;

  @ApiProperty({ description: 'Detailed description of the zone' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Zone geometry as GeoJSON' })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  geometry: Geometry;

  @ApiProperty({ description: 'Total area of the zone in square meters' })
  @Column({ name: 'area_sqm', type: 'decimal', precision: 15, scale: 2 })
  areaSqm: number;

  @ApiProperty({ description: 'Perimeter of the zone in meters' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  perimeter?: number;

  @ApiProperty({ description: 'Minimum lot size allowed in square meters' })
  @Column({ name: 'min_lot_size', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minLotSize?: number;

  @ApiProperty({ description: 'Maximum lot size allowed in square meters' })
  @Column({ name: 'max_lot_size', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxLotSize?: number;

  @ApiProperty({ description: 'Maximum building height allowed in meters' })
  @Column({ name: 'max_building_height', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxBuildingHeight?: number;

  @ApiProperty({ description: 'Maximum floor area ratio (FAR)' })
  @Column({ name: 'max_far', type: 'decimal', precision: 3, scale: 2, nullable: true })
  maxFAR?: number;

  @ApiProperty({ description: 'Minimum setback from front boundary in meters' })
  @Column({ name: 'front_setback', type: 'decimal', precision: 5, scale: 2, nullable: true })
  frontSetback?: number;

  @ApiProperty({ description: 'Minimum setback from rear boundary in meters' })
  @Column({ name: 'rear_setback', type: 'decimal', precision: 5, scale: 2, nullable: true })
  rearSetback?: number;

  @ApiProperty({ description: 'Minimum setback from side boundaries in meters' })
  @Column({ name: 'side_setback', type: 'decimal', precision: 5, scale: 2, nullable: true })
  sideSetback?: number;

  @ApiProperty({ description: 'Maximum lot coverage percentage' })
  @Column({ name: 'max_coverage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxCoverage?: number;

  @ApiProperty({ description: 'Minimum green space percentage' })
  @Column({ name: 'min_green_space', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minGreenSpace?: number;

  @ApiProperty({ description: 'Allowed land uses within this zone' })
  @Column({ name: 'allowed_uses', type: 'jsonb', nullable: true })
  allowedUses?: string[];

  @ApiProperty({ description: 'Prohibited land uses within this zone' })
  @Column({ name: 'prohibited_uses', type: 'jsonb', nullable: true })
  prohibitedUses?: string[];

  @ApiProperty({ description: 'Special conditions or requirements' })
  @Column({ name: 'special_conditions', type: 'jsonb', nullable: true })
  specialConditions?: Record<string, any>;

  @ApiProperty({ description: 'Date when the zone becomes effective' })
  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: Date;

  @ApiProperty({ description: 'Date when the zone expires (if applicable)' })
  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date;

  @ApiProperty({ description: 'Date of last review' })
  @Column({ name: 'last_review_date', type: 'date', nullable: true })
  lastReviewDate?: Date;

  @ApiProperty({ description: 'Date of next scheduled review' })
  @Column({ name: 'next_review_date', type: 'date', nullable: true })
  nextReviewDate?: Date;

  @ApiProperty({ description: 'Legal reference or ordinance number' })
  @Column({ name: 'legal_reference', type: 'varchar', length: 255, nullable: true })
  legalReference?: string;

  @ApiProperty({ description: 'IPFS hash for supporting documents' })
  @Column({ name: 'documents_ipfs', type: 'varchar', length: 100, nullable: true })
  documentsIpfs?: string;

  @ApiProperty({ description: 'Priority level for development' })
  @Column({ type: 'int', default: 1 })
  priority: number;

  @ApiProperty({ description: 'Whether the zone is currently active' })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional metadata as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Notes or comments about the zone' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Zone creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Zone last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiryDate ? new Date() > this.expiryDate : false;
  }

  get isEffective(): boolean {
    return new Date() >= this.effectiveDate && !this.isExpired;
  }

  get needsReview(): boolean {
    return this.nextReviewDate ? new Date() >= this.nextReviewDate : false;
  }

  get areaInHectares(): number {
    return this.areaSqm / 10000;
  }

  get areaInAcres(): number {
    return this.areaSqm / 4047;
  }

  get daysUntilExpiry(): number | null {
    if (!this.expiryDate) return null;
    const diffTime = this.expiryDate.getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isNearExpiry(): boolean {
    const days = this.daysUntilExpiry;
    return days !== null && days <= 90; // Consider near expiry if less than 90 days
  }
}
