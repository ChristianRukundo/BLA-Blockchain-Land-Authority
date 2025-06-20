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
import { LandParcel } from '../../lais/entities/land-parcel.entity';

export enum RequestStatus {
  PENDING = 'PENDING',
  VERIFICATION_REQUESTED = 'VERIFICATION_REQUESTED',
  DEATH_VERIFIED = 'DEATH_VERIFIED',
  DEATH_REJECTED = 'DEATH_REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
  APPROVED = 'APPROVED'
}

export enum VerificationSource {
  NIDA = 'NIDA',
  HOSPITAL = 'HOSPITAL',
  COURT = 'COURT',
  MANUAL = 'MANUAL',
}

@Entity('inheritance_requests')
@Index(['parcelId'])
@Index(['heirAddress'])
@Index(['status'])
@Index(['requestDate'])
export class InheritanceRequest {
  @ApiProperty({ description: 'Unique identifier for the inheritance request' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated land parcel ID' })
  @Column({ type: 'uuid' })
  parcelId: string;

  @ApiProperty({ description: 'Land parcel entity', type: () => LandParcel })
  @ManyToOne(() => LandParcel)
  @JoinColumn({ name: 'parcelId' })
  parcel: LandParcel;

  @ApiProperty({ description: 'Original owner address' })
  @Column({ type: 'varchar', length: 42 })
  ownerAddress: string;

  @ApiProperty({ description: 'Designated heir address' })
  @Column({ type: 'varchar', length: 42 })
  heirAddress: string;

  @ApiProperty({ description: 'User who requested the inheritance' })
  @Column({ type: 'varchar', length: 42 })
  requestedBy: string;

  @ApiProperty({ description: 'Associated inheritance ID' })
  @Column({ type: 'uuid', nullable: true })
  inheritanceId: string;

  @ApiProperty({ description: 'Inheritance request status', enum: RequestStatus })
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @ApiProperty({ description: 'Date when inheritance was requested' })
  @Column({ type: 'timestamp' })
  requestDate: Date;

  @ApiProperty({ description: 'Chainlink request ID for death verification' })
  @Column({ type: 'varchar', length: 66, nullable: true })
  chainlinkRequestId: string;

  @ApiProperty({ description: 'Death verification source', enum: VerificationSource })
  @Column({ type: 'enum', enum: VerificationSource, nullable: true })
  verificationSource: VerificationSource;

  @ApiProperty({ description: 'Death certificate hash' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  deathCertificateHash: string;

  @ApiProperty({ description: 'Date of death as verified' })
  @Column({ type: 'date', nullable: true })
  dateOfDeath: Date;

  @ApiProperty({ description: 'IPFS hash of death certificate or supporting documents' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  documentsHash: string;

  @ApiProperty({ description: 'Oracle verification response data' })
  @Column({ type: 'jsonb', nullable: true })
  verificationData: any;

  @ApiProperty({ description: 'Transaction hash for inheritance transfer' })
  @Column({ type: 'varchar', length: 66, nullable: true })
  transferTransactionHash: string;

  @ApiProperty({ description: 'Date when inheritance was completed' })
  @Column({ type: 'timestamp', nullable: true })
  completedDate: Date;

  @ApiProperty({ description: 'Date when request was processed' })
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @ApiProperty({ description: 'User who processed the request' })
  @Column({ type: 'varchar', length: 42, nullable: true })
  processedBy: string;

  @ApiProperty({ description: 'Verification notes from processor' })
  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @ApiProperty({ description: 'Oracle verification transaction hash' })
  @Column({ type: 'varchar', length: 66, nullable: true })
  oracleVerificationTxHash: string;

  @ApiProperty({ description: 'Reason for rejection or cancellation' })
  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @ApiProperty({ description: 'Additional notes or comments' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ description: 'Whether manual verification is required' })
  @Column({ type: 'boolean', default: false })
  requiresManualVerification: boolean;

  @ApiProperty({ description: 'Admin who performed manual verification' })
  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @ApiProperty({ description: 'Date of manual verification' })
  @Column({ type: 'timestamp', nullable: true })
  verifiedDate: Date;

  @ApiProperty({ description: 'Dispute ID if inheritance is disputed' })
  @Column({ type: 'uuid', nullable: true })
  disputeId: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isPending(): boolean {
    return this.status === RequestStatus.PENDING;
  }

  get isVerified(): boolean {
    return this.status === RequestStatus.DEATH_VERIFIED;
  }

  get isCompleted(): boolean {
    return this.status === RequestStatus.COMPLETED;
  }

  get canExecute(): boolean {
    return this.status === RequestStatus.DEATH_VERIFIED && !this.transferTransactionHash;
  }

  get daysSinceRequest(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.requestDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}