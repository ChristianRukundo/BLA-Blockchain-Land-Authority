import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ExpropriationStatus {
  FLAGGED = 'FLAGGED',
  COMPENSATION_DEPOSITED = 'COMPENSATION_DEPOSITED',
  COMPENSATION_CLAIMED = 'COMPENSATION_CLAIMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('expropriations')
export class Expropriation {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  @Column()
  parcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @Column()
  currentOwnerAddress: string;

  @ApiProperty({ description: 'Expropriating authority' })
  @Column()
  expropriatingAuthority: string;

  @ApiProperty({ description: 'Title of the expropriation' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Reason for expropriation' })
  @Column('text')
  reason: string;

  @ApiProperty({ description: 'Legal basis for expropriation' })
  @Column('text')
  legalBasis: string;

  @ApiProperty({ description: 'Proposed compensation amount' })
  @Column('decimal', { precision: 18, scale: 2 })
  proposedCompensation: number;

  @ApiProperty({ description: 'Actual compensation amount' })
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  actualCompensation?: number;

  @ApiProperty({ description: 'Expropriation status', enum: ExpropriationStatus })
  @Column({
    type: 'enum',
    enum: ExpropriationStatus,
    default: ExpropriationStatus.FLAGGED,
  })
  status: ExpropriationStatus;

  @ApiProperty({ description: 'Date when parcel was flagged' })
  @Column('timestamp')
  flaggedDate: Date;

  @ApiProperty({ description: 'Date when compensation was deposited' })
  @Column('timestamp', { nullable: true })
  compensationDepositedDate?: Date;

  @ApiProperty({ description: 'Date when compensation was claimed' })
  @Column('timestamp', { nullable: true })
  compensationClaimedDate?: Date;

  @ApiProperty({ description: 'Date when expropriation was completed' })
  @Column('timestamp', { nullable: true })
  completedDate?: Date;

  @ApiProperty({ description: 'New owner address after completion' })
  @Column({ nullable: true })
  newOwnerAddress?: string;

  @ApiProperty({ description: 'IPFS hash of reason document' })
  @Column({ nullable: true })
  reasonDocumentHash?: string;

  @ApiProperty({ description: 'Flag transaction hash' })
  @Column({ nullable: true })
  flagTransactionHash?: string;

  @ApiProperty({ description: 'Deposit transaction hash' })
  @Column({ nullable: true })
  depositTransactionHash?: string;

  @ApiProperty({ description: 'Claim transaction hash' })
  @Column({ nullable: true })
  claimTransactionHash?: string;

  @ApiProperty({ description: 'Completion transaction hash' })
  @Column({ nullable: true })
  completionTransactionHash?: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Timeline for expropriation process' })
  @Column('text', { nullable: true })
  timeline?: string;

  @ApiProperty({ description: 'Contact information' })
  @Column('text', { nullable: true })
  contactInformation?: string;

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
  get canDepositCompensation(): boolean {
    return this.status === ExpropriationStatus.FLAGGED;
  }

  get canClaimCompensation(): boolean {
    return this.status === ExpropriationStatus.COMPENSATION_DEPOSITED;
  }

  get canComplete(): boolean {
    return this.status === ExpropriationStatus.COMPENSATION_CLAIMED;
  }

  get canCancel(): boolean {
    return this.status !== ExpropriationStatus.COMPLETED;
  }

  get isActive(): boolean {
    return [
      ExpropriationStatus.FLAGGED,
      ExpropriationStatus.COMPENSATION_DEPOSITED,
      ExpropriationStatus.COMPENSATION_CLAIMED,
    ].includes(this.status);
  }

  get processingDays(): number {
    if (!this.completedDate) return 0;
    const flaggedDate = new Date(this.flaggedDate);
    const completedDate = new Date(this.completedDate);
    const diffTime = Math.abs(completedDate.getTime() - flaggedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

