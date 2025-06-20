import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LandParcel } from '../../lais/entities/land-parcel.entity';

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
  EVIDENCE_SUBMISSION = 'EVIDENCE_SUBMISSION',
  PENDING_ARBITRATION = 'PENDING_ARBITRATION',
  UNDER_ARBITRATION = 'UNDER_ARBITRATION',
  KLEROS_SUBMITTED = 'KLEROS_SUBMITTED',
  JURY_SELECTION = 'JURY_SELECTION',
  VOTING_PERIOD = 'VOTING_PERIOD',
  AWAITING_RULING = 'AWAITING_RULING',
  RULING_GIVEN = 'RULING_GIVEN',
  APPEAL_PERIOD = 'APPEAL_PERIOD',
  UNDER_APPEAL = 'UNDER_APPEAL',
  RULING_EXECUTED = 'RULING_EXECUTED',
  SETTLED = 'SETTLED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
  FAILED_ARBITRATION = 'FAILED_ARBITRATION',
}

export enum DisputeRuling {
  PENDING = 'PENDING',
  PLAINTIFF_WINS = 'PLAINTIFF_WINS',
  DEFENDANT_WINS = 'DEFENDANT_WINS',
  SETTLEMENT_REACHED = 'SETTLEMENT_REACHED',
  DISMISSED = 'DISMISSED',
  REFUSE_TO_ARBITRATE = 'REFUSE_TO_ARBITRATE',
  OTHER = 'OTHER',
}

export enum DisputePartyType {
  PLAINTIFF = 'PLAINTIFF',
  DEFENDANT = 'DEFENDANT',
  INTERVENOR = 'INTERVENOR',
  WITNESS = 'WITNESS',
}

@Entity('dispute_evidence')
export class DisputeEvidence {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID of the dispute this evidence belongs to' })
  @Column('uuid')
  @Index()
  disputeId: string;

  @ManyToOne(() => Dispute, dispute => dispute.evidenceEntries)
  dispute: Dispute;

  @ApiProperty({ description: 'Address of the party submitting the evidence' })
  @Column()
  @Index()
  submitterAddress: string;

  @ApiProperty({ enum: DisputePartyType, description: 'Role of the submitter in this dispute' })
  @Column({ type: 'enum', enum: DisputePartyType, nullable: true })
  submitterRole?: DisputePartyType;

  @ApiProperty({ description: 'Title or brief name of the evidence' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Detailed description of the evidence' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'IPFS hash or secure URL of the evidence file/document' })
  @Column()
  evidenceHashOrUrl: string;

  @ApiPropertyOptional({ description: 'Type of the evidence file (e.g., PDF, image, video)' })
  @Column({ nullable: true })
  fileType?: string;

  @ApiPropertyOptional({ description: 'Size of the evidence file in bytes' })
  @Column('bigint', { nullable: true })
  fileSize?: string;

  @ApiProperty({ description: 'Date and time when the evidence was submitted' })
  @CreateDateColumn()
  submittedDate: Date;

  @ApiPropertyOptional({ description: 'Additional metadata for the evidence' })
  @Column('jsonb', { nullable: true })
  metadata?: any;
}

@Entity('disputes')
export class Dispute {
  @ApiProperty({ description: 'Unique database identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ description: 'On-chain dispute ID (if applicable, e.g., from Kleros)' })
  @Column({ nullable: true, unique: true, type: 'varchar' })
  @Index()
  externalDisputeId?: string;

  @ApiProperty({ description: 'ID of the Land Parcel this dispute relates to' })
  @Column('uuid')
  @Index()
  parcelId: string;

  @ManyToOne(() => LandParcel, { onDelete: 'SET NULL', nullable: true })
  parcel?: LandParcel;

  @ApiProperty({ description: 'Type of the dispute', enum: DisputeType })
  @Column({ type: 'enum', enum: DisputeType })
  disputeType: DisputeType;

  @ApiProperty({ description: 'Current status of the dispute', enum: DisputeStatus })
  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.CREATED })
  status: DisputeStatus;

  @ApiProperty({ description: 'Title of the dispute' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Detailed description of the dispute claim' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'Wallet address of the plaintiff (initiator)' })
  @Column()
  @Index()
  plaintiffAddress: string;

  @ApiProperty({ description: 'Wallet address of the defendant' })
  @Column()
  @Index()
  defendantAddress: string;

  @ApiPropertyOptional({ description: 'Other involved parties (addresses)', type: [String] })
  @Column('simple-array', { nullable: true })
  involvedParties?: string[];

  @ApiProperty({ description: 'Date when the dispute was created in the system' })
  @CreateDateColumn()
  createdDate: Date;

  @ApiPropertyOptional({ description: 'Deadline for evidence submission' })
  @Column('timestamp with time zone', { nullable: true })
  evidenceSubmissionDeadline?: Date;

  @OneToMany(() => DisputeEvidence, evidence => evidence.dispute, { cascade: true, eager: false })
  evidenceEntries?: DisputeEvidence[];

  @ApiPropertyOptional({
    description: 'Date when the dispute was escalated to an external arbitrator',
  })
  @Column('timestamp with time zone', { nullable: true })
  escalationDate?: Date;

  @ApiPropertyOptional({ description: 'Fee paid for arbitration (as string for large numbers)' })
  @Column('decimal', { precision: 30, scale: 0, nullable: true })
  arbitrationFeePaid?: string;

  @ApiPropertyOptional({ description: 'ID or name of the arbitration court/platform' })
  @Column({ nullable: true })
  arbitrationCourtId?: string;

  @ApiPropertyOptional({ description: 'Number of arbitrators/jurors assigned' })
  @Column('int', { nullable: true })
  numberOfArbitrators?: number;

  @ApiPropertyOptional({
    description: 'The final ruling given in the dispute',
    enum: DisputeRuling,
  })
  @Column({ type: 'enum', enum: DisputeRuling, nullable: true })
  ruling?: DisputeRuling;

  @ApiPropertyOptional({ description: 'Date when the final ruling was given' })
  @Column('timestamp with time zone', { nullable: true })
  rulingDate?: Date;

  @ApiPropertyOptional({ description: 'Detailed reasoning or text of the ruling' })
  @Column('text', { nullable: true })
  rulingDetails?: string;

  @ApiPropertyOptional({ description: 'Date when the ruling was (or is to be) actioned/executed' })
  @Column('timestamp with time zone', { nullable: true })
  resolvedDate?: Date;

  @ApiPropertyOptional({
    description: 'Transaction hash if ruling execution involved an on-chain transaction',
  })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Deadline for filing an appeal after a ruling' })
  @Column('timestamp with time zone', { nullable: true })
  appealDeadline?: Date;

  @ApiProperty({ description: 'Number of times this dispute has been appealed' })
  @Column('int', { default: 0 })
  appealCount: number;

  @ApiPropertyOptional({ description: 'Fee paid for the latest appeal (as string)' })
  @Column('decimal', { precision: 30, scale: 0, nullable: true })
  appealFeePaid?: string;

  @ApiPropertyOptional({ description: 'Amount agreed upon if the dispute was settled (as string)' })
  @Column('decimal', { precision: 30, scale: 0, nullable: true })
  settlementAmount?: string;

  @ApiPropertyOptional({ description: 'Reason if the dispute was cancelled' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'General notes or internal comments about the dispute' })
  @Column('text', { nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON format)' })
  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ApiProperty({ description: 'Timestamp of the last update to this record' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Indicates if evidence can currently be submitted' })
  get canSubmitEvidence(): boolean {
    return (
      (this.status === DisputeStatus.CREATED ||
        this.status === DisputeStatus.EVIDENCE_SUBMISSION) &&
      this.evidenceSubmissionDeadline &&
      new Date() < new Date(this.evidenceSubmissionDeadline)
    );
  }

  @ApiProperty({ description: 'Indicates if the dispute can be escalated to arbitration' })
  get canEscalateToArbitration(): boolean {
    return (
      (this.status === DisputeStatus.EVIDENCE_SUBMISSION &&
        (!this.evidenceSubmissionDeadline ||
          new Date() >= new Date(this.evidenceSubmissionDeadline))) ||
      this.status === DisputeStatus.CREATED
    );
  }

  @ApiProperty({ description: 'Indicates if the current ruling can be appealed' })
  get canAppeal(): boolean {
    return (
      this.status === DisputeStatus.RULING_GIVEN &&
      this.appealDeadline &&
      new Date() < new Date(this.appealDeadline) &&
      this.appealCount < (this.metadata?.maxAppeals || 1)
    );
  }

  @ApiProperty({ description: 'Indicates if the ruling can be executed' })
  get canExecuteRuling(): boolean {
    return (
      this.status === DisputeStatus.RULING_GIVEN &&
      !!this.ruling &&
      this.ruling !== DisputeRuling.PENDING &&
      !this.executionTransactionHash &&
      (!this.appealDeadline || new Date() >= new Date(this.appealDeadline) || !this.canAppeal)
    );
  }

  @ApiProperty({ description: 'Indicates if the dispute is considered active/open' })
  get isActive(): boolean {
    return ![
      DisputeStatus.RESOLVED,
      DisputeStatus.CANCELLED,
      DisputeStatus.RULING_EXECUTED,
      DisputeStatus.SETTLED,
      DisputeStatus.FAILED_ARBITRATION,
    ].includes(this.status);
  }
}
