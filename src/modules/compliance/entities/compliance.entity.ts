import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ComplianceStatus {
  PENDING = 'PENDING',
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

@Entity('compliance_reports')
export class ComplianceReport {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  @Column()
  parcelId: string;

  @ApiProperty({ description: 'Type of compliance rule' })
  @Column()
  ruleType: string;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING,
  })
  status: ComplianceStatus;

  @ApiProperty({ description: 'Compliance score (0-100)' })
  @Column('int', { default: 0 })
  complianceScore: number;

  @ApiProperty({ description: 'Assessment date' })
  @Column('timestamp')
  assessmentDate: Date;

  @ApiProperty({ description: 'Valid until date' })
  @Column('timestamp', { nullable: true })
  validUntil?: Date;

  @ApiProperty({ description: 'Assessor wallet address' })
  @Column({ nullable: true })
  assessorAddress?: string;

  @ApiProperty({ description: 'Assessment details' })
  @Column('text', { nullable: true })
  details?: string;

  @ApiProperty({ description: 'Fine amount levied' })
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  fineAmount: number;

  @ApiProperty({ description: 'Whether fine has been paid' })
  @Column('boolean', { default: false })
  finePaid: boolean;

  @ApiProperty({ description: 'Incentive amount awarded' })
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  incentiveAmount: number;

  @ApiProperty({ description: 'Whether incentive has been awarded' })
  @Column('boolean', { default: false })
  incentiveAwarded: boolean;

  @ApiProperty({ description: 'Remediation deadline' })
  @Column('timestamp', { nullable: true })
  remediationDeadline?: Date;

  @ApiProperty({ description: 'Evidence hash from IPFS' })
  @Column({ nullable: true })
  evidenceHash?: string;

  @ApiProperty({ description: 'Oracle request ID' })
  @Column({ nullable: true })
  oracleRequestId?: string;

  @ApiProperty({ description: 'Additional notes' })
  @Column('text', { nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isValid(): boolean {
    return this.validUntil ? new Date(this.validUntil) > new Date() : false;
  }

  get isOverdue(): boolean {
    return this.remediationDeadline ? 
      new Date(this.remediationDeadline) < new Date() && 
      this.status === ComplianceStatus.NON_COMPLIANT : false;
  }

  get daysSinceAssessment(): number {
    const now = new Date();
    const assessmentDate = new Date(this.assessmentDate);
    const diffTime = Math.abs(now.getTime() - assessmentDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

@Entity('compliance_rules')
export class ComplianceRule {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Rule type identifier' })
  @Column({ unique: true })
  ruleType: string;

  @ApiProperty({ description: 'Rule description' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'Rule category' })
  @Column({ nullable: true })
  category?: string;

  @ApiProperty({ description: 'Fine amount for violations' })
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  fineAmount: number;

  @ApiProperty({ description: 'Incentive amount for compliance' })
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  incentiveAmount: number;

  @ApiProperty({ description: 'Whether the rule is active' })
  @Column('boolean', { default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Rule parameters in JSON format' })
  @Column('jsonb', { nullable: true })
  parameters?: any;

  @ApiProperty({ description: 'Assessment frequency in days' })
  @Column('int', { default: 30 })
  assessmentFrequency: number;

  @ApiProperty({ description: 'Remediation period in days' })
  @Column('int', { default: 30 })
  remediationPeriod: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  @Column('timestamp')
  lastUpdated: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;
}

