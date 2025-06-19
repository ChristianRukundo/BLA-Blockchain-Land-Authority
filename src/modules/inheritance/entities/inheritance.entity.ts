import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum InheritanceStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum VerificationSource {
  NIDA = 'NIDA',
  HOSPITAL = 'HOSPITAL',
  COURT = 'COURT',
  MANUAL = 'MANUAL',
  ORACLE = 'ORACLE',
}

@Entity('inheritance_requests')
export class InheritanceRequest {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'On-chain request ID' })
  @Column({ nullable: true })
  requestId?: string;

  @ApiProperty({ description: 'Land parcel ID' })
  @Column()
  parcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @Column()
  currentOwnerAddress: string;

  @ApiProperty({ description: 'Heir wallet address' })
  @Column()
  heirAddress: string;

  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus })
  @Column({
    type: 'enum',
    enum: InheritanceStatus,
    default: InheritanceStatus.PENDING,
  })
  status: InheritanceStatus;

  @ApiProperty({ description: 'Request date' })
  @Column('timestamp')
  requestDate: Date;

  @ApiProperty({ description: 'Evidence hash from IPFS' })
  @Column({ nullable: true })
  evidenceHash?: string;

  @ApiProperty({ description: 'Whether death has been verified' })
  @Column('boolean', { default: false })
  isVerified: boolean;

  @ApiProperty({ description: 'Verification source', enum: VerificationSource })
  @Column({
    type: 'enum',
    enum: VerificationSource,
    nullable: true,
  })
  verificationSource?: VerificationSource;

  @ApiProperty({ description: 'Verification details' })
  @Column('text', { nullable: true })
  verificationDetails?: string;

  @ApiProperty({ description: 'Verification date' })
  @Column('timestamp', { nullable: true })
  verificationDate?: Date;

  @ApiProperty({ description: 'Processing date' })
  @Column('timestamp', { nullable: true })
  processedDate?: Date;

  @ApiProperty({ description: 'Execution transaction hash' })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

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
  get canVerify(): boolean {
    return this.status === InheritanceStatus.PENDING;
  }

  get canProcess(): boolean {
    return this.status === InheritanceStatus.VERIFIED && this.isVerified;
  }

  get canCancel(): boolean {
    return this.status !== InheritanceStatus.COMPLETED;
  }

  get isActive(): boolean {
    return [
      InheritanceStatus.PENDING,
      InheritanceStatus.VERIFIED,
    ].includes(this.status);
  }

  get processingDays(): number {
    if (!this.processedDate) return 0;
    const requestDate = new Date(this.requestDate);
    const processedDate = new Date(this.processedDate);
    const diffTime = Math.abs(processedDate.getTime() - requestDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get verificationDays(): number {
    if (!this.verificationDate) return 0;
    const requestDate = new Date(this.requestDate);
    const verificationDate = new Date(this.verificationDate);
    const diffTime = Math.abs(verificationDate.getTime() - requestDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

