import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LandParcel } from '../lais/entities/land-parcel.entity';

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_ASSESSMENT = 'PENDING_ASSESSMENT',
  EXEMPTED = 'EXEMPTED',
}

export enum ComplianceRuleType {
  LAND_USE_RESTRICTION = 'LAND_USE_RESTRICTION',
  ENVIRONMENTAL_PROTECTION = 'ENVIRONMENTAL_PROTECTION',
  BUILDING_REGULATION = 'BUILDING_REGULATION',
  AGRICULTURAL_PRACTICE = 'AGRICULTURAL_PRACTICE',
  CONSERVATION_REQUIREMENT = 'CONSERVATION_REQUIREMENT',
}

@Entity('compliance_reports')
@Index(['parcelId'])
@Index(['status'])
@Index(['ruleType'])
@Index(['assessmentDate'])
export class ComplianceReport {
  @ApiProperty({ description: 'Unique identifier for the compliance report' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated land parcel ID' })
  @Column({ type: 'uuid' })
  parcelId: string;

  @ApiProperty({ description: 'Land parcel entity', type: () => LandParcel })
  @ManyToOne(() => LandParcel)
  @JoinColumn({ name: 'parcelId' })
  parcel: LandParcel;

  @ApiProperty({ description: 'Compliance rule type', enum: ComplianceRuleType })
  @Column({ type: 'enum', enum: ComplianceRuleType })
  ruleType: ComplianceRuleType;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  @Column({ type: 'enum', enum: ComplianceStatus })
  status: ComplianceStatus;

  @ApiProperty({ description: 'Assessment date' })
  @Column({ type: 'timestamp' })
  assessmentDate: Date;

  @ApiProperty({ description: 'Oracle observation data' })
  @Column({ type: 'jsonb' })
  observationData: any;

  @ApiProperty({ description: 'IPFS hash of detailed report' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  reportHash: string;

  @ApiProperty({ description: 'Fine amount in MockRWF tokens' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fineAmount: number;

  @ApiProperty({ description: 'Incentive amount in EcoCredits' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  incentiveAmount: number;

  @ApiProperty({ description: 'Transaction hash for fine/incentive' })
  @Column({ type: 'varchar', length: 66, nullable: true })
  transactionHash: string;

  @ApiProperty({ description: 'Compliance score (0-100)' })
  @Column({ type: 'integer', default: 0 })
  complianceScore: number;

  @ApiProperty({ description: 'Violation description' })
  @Column({ type: 'text', nullable: true })
  violationDescription: string;

  @ApiProperty({ description: 'Remediation actions required' })
  @Column({ type: 'text', nullable: true })
  remediationActions: string;

  @ApiProperty({ description: 'Due date for remediation' })
  @Column({ type: 'timestamp', nullable: true })
  remediationDueDate: Date;

  @ApiProperty({ description: 'Whether the report has been reviewed' })
  @Column({ type: 'boolean', default: false })
  isReviewed: boolean;

  @ApiProperty({ description: 'Reviewer ID' })
  @Column({ type: 'uuid', nullable: true })
  reviewerId: string;

  @ApiProperty({ description: 'Review notes' })
  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isCompliant(): boolean {
    return this.status === ComplianceStatus.COMPLIANT;
  }

  get requiresAction(): boolean {
    return this.status === ComplianceStatus.NON_COMPLIANT && 
           this.remediationDueDate && 
           this.remediationDueDate > new Date();
  }

  get isOverdue(): boolean {
    return this.status === ComplianceStatus.NON_COMPLIANT && 
           this.remediationDueDate && 
           this.remediationDueDate < new Date();
  }
}

