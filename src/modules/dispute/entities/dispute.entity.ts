import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum DisputeType {
  OWNERSHIP = 'OWNERSHIP',
  BOUNDARY = 'BOUNDARY',
  INHERITANCE = 'INHERITANCE',
  EXPROPRIATION = 'EXPROPRIATION',
  COMPLIANCE = 'COMPLIANCE',
  FRAUD = 'FRAUD',
  OTHER = 'OTHER',
}

export enum DisputeStatus {
  CREATED = 'CREATED',
  EVIDENCE_SUBMITTED = 'EVIDENCE_SUBMITTED',
  ESCALATED_TO_KLEROS = 'ESCALATED_TO_KLEROS',
  UNDER_ARBITRATION = 'UNDER_ARBITRATION',
  RULING_GIVEN = 'RULING_GIVEN',
  EXECUTED = 'EXECUTED',
  APPEALED = 'APPEALED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum DisputeParty {
  PLAINTIFF = 'PLAINTIFF',
  DEFENDANT = 'DEFENDANT',
  THIRD_PARTY = 'THIRD_PARTY',
}

@Entity('disputes')
export class Dispute {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'On-chain dispute ID' })
  @Column({ nullable: true })
  disputeId?: string;

  @ApiProperty({ description: 'Kleros dispute ID' })
  @Column({ nullable: true })
  klerosDisputeId?: string;

  @ApiProperty({ description: 'Land parcel ID' })
  @Column()
  parcelId: string;

  @ApiProperty({ description: 'Dispute type', enum: DisputeType })
  @Column({
    type: 'enum',
    enum: DisputeType,
  })
  disputeType: DisputeType;

  @ApiProperty({ description: 'Dispute status', enum: DisputeStatus })
  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.CREATED,
  })
  status: DisputeStatus;

  @ApiProperty({ description: 'Dispute title' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Dispute description' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'Plaintiff wallet address' })
  @Column()
  plaintiffAddress: string;

  @ApiProperty({ description: 'Defendant wallet address' })
  @Column()
  defendantAddress: string;

  @ApiProperty({ description: 'Third party addresses involved' })
  @Column('simple-array', { default: '' })
  thirdPartyAddresses: string[];

  @ApiProperty({ description: 'Dispute creation date' })
  @Column('timestamp')
  createdDate: Date;

  @ApiProperty({ description: 'Evidence submission deadline' })
  @Column('timestamp', { nullable: true })
  evidenceDeadline?: Date;

  @ApiProperty({ description: 'Evidence hashes from IPFS' })
  @Column('simple-array', { default: '' })
  evidenceHashes: string[];

  @ApiProperty({ description: 'Evidence submitted by plaintiff' })
  @Column('simple-array', { default: '' })
  plaintiffEvidence: string[];

  @ApiProperty({ description: 'Evidence submitted by defendant' })
  @Column('simple-array', { default: '' })
  defendantEvidence: string[];

  @ApiProperty({ description: 'Evidence submitted by third parties' })
  @Column('simple-array', { default: '' })
  thirdPartyEvidence: string[];

  @ApiProperty({ description: 'Date when escalated to Kleros' })
  @Column('timestamp', { nullable: true })
  escalatedDate?: Date;

  @ApiProperty({ description: 'Kleros arbitration fee' })
  @Column('decimal', { precision: 18, scale: 0, nullable: true })
  arbitrationFee?: string;

  @ApiProperty({ description: 'Kleros court ID' })
  @Column({ nullable: true })
  klerosCourtId?: string;

  @ApiProperty({ description: 'Number of jurors' })
  @Column('int', { nullable: true })
  numberOfJurors?: number;

  @ApiProperty({ description: 'Ruling date' })
  @Column('timestamp', { nullable: true })
  rulingDate?: Date;

  @ApiProperty({ description: 'Kleros ruling (0=refuse to arbitrate, 1=plaintiff wins, 2=defendant wins)' })
  @Column('int', { nullable: true })
  klerosRuling?: number;

  @ApiProperty({ description: 'Ruling details' })
  @Column('text', { nullable: true })
  rulingDetails?: string;

  @ApiProperty({ description: 'Date when ruling was executed' })
  @Column('timestamp', { nullable: true })
  executedDate?: Date;

  @ApiProperty({ description: 'Execution transaction hash' })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Appeal deadline' })
  @Column('timestamp', { nullable: true })
  appealDeadline?: Date;

  @ApiProperty({ description: 'Whether dispute has been appealed' })
  @Column('boolean', { default: false })
  isAppealed: boolean;

  @ApiProperty({ description: 'Appeal fee' })
  @Column('decimal', { precision: 18, scale: 0, nullable: true })
  appealFee?: string;

  @ApiProperty({ description: 'Settlement amount' })
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  settlementAmount?: number;

  @ApiProperty({ description: 'Settlement date' })
  @Column('timestamp', { nullable: true })
  settlementDate?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Additional metadata' })
  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get canSubmitEvidence(): boolean {
    return this.status === DisputeStatus.CREATED && 
           this.evidenceDeadline && 
           new Date(this.evidenceDeadline) > new Date();
  }

  get canEscalate(): boolean {
    return this.status === DisputeStatus.EVIDENCE_SUBMITTED && !this.klerosDisputeId;
  }

  get canAppeal(): boolean {
    return this.status === DisputeStatus.RULING_GIVEN && 
           this.appealDeadline && 
           new Date(this.appealDeadline) > new Date() &&
           !this.isAppealed;
  }

  get canExecute(): boolean {
    return this.status === DisputeStatus.RULING_GIVEN && 
           this.klerosRuling !== undefined &&
           this.klerosRuling !== 0 &&
           !this.executionTransactionHash &&
           (!this.appealDeadline || new Date(this.appealDeadline) <= new Date());
  }

  get isActive(): boolean {
    return [
      DisputeStatus.CREATED,
      DisputeStatus.EVIDENCE_SUBMITTED,
      DisputeStatus.ESCALATED_TO_KLEROS,
      DisputeStatus.UNDER_ARBITRATION,
      DisputeStatus.RULING_GIVEN,
    ].includes(this.status);
  }

  get totalEvidenceCount(): number {
    return this.evidenceHashes.length;
  }

  get processingDays(): number {
    const endDate = this.executedDate || this.settlementDate || new Date();
    const startDate = new Date(this.createdDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilEvidenceDeadline(): number {
    if (!this.evidenceDeadline) return -1;
    const now = new Date();
    const deadline = new Date(this.evidenceDeadline);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilAppealDeadline(): number {
    if (!this.appealDeadline) return -1;
    const now = new Date();
    const deadline = new Date(this.appealDeadline);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get rulingText(): string {
    if (this.klerosRuling === undefined) return 'Pending';
    switch (this.klerosRuling) {
      case 0: return 'Refuse to arbitrate';
      case 1: return 'Plaintiff wins';
      case 2: return 'Defendant wins';
      default: return 'Unknown ruling';
    }
  }
}

