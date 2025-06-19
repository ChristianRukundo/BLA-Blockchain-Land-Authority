import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminActionType {
  MINT_LAND_PARCEL = 'MINT_LAND_PARCEL',
  TRANSFER_OWNERSHIP = 'TRANSFER_OWNERSHIP',
  UPDATE_SYSTEM_PARAMETERS = 'UPDATE_SYSTEM_PARAMETERS',
  UPGRADE_CONTRACT = 'UPGRADE_CONTRACT',
  EMERGENCY_PAUSE = 'EMERGENCY_PAUSE',
  EMERGENCY_UNPAUSE = 'EMERGENCY_UNPAUSE',
  GRANT_ROLE = 'GRANT_ROLE',
  REVOKE_ROLE = 'REVOKE_ROLE',
  UPDATE_COMPLIANCE_RULES = 'UPDATE_COMPLIANCE_RULES',
  MANAGE_TREASURY = 'MANAGE_TREASURY',
  CONFIGURE_ORACLES = 'CONFIGURE_ORACLES',
  BULK_DATA_IMPORT = 'BULK_DATA_IMPORT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
}

export enum AdminActionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
}

@Entity('admin_actions')
export class AdminAction {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Action type', enum: AdminActionType })
  @Column({
    type: 'enum',
    enum: AdminActionType,
  })
  actionType: AdminActionType;

  @ApiProperty({ description: 'Action title' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Action description' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'Initiator wallet address' })
  @Column()
  initiatorAddress: string;

  @ApiProperty({ description: 'Action status', enum: AdminActionStatus })
  @Column({
    type: 'enum',
    enum: AdminActionStatus,
    default: AdminActionStatus.PENDING,
  })
  status: AdminActionStatus;

  @ApiProperty({ description: 'Target contract address' })
  @Column({ nullable: true })
  targetContract?: string;

  @ApiProperty({ description: 'Function signature to call' })
  @Column({ nullable: true })
  functionSignature?: string;

  @ApiProperty({ description: 'Function parameters' })
  @Column('jsonb', { nullable: true })
  parameters?: any[];

  @ApiProperty({ description: 'Value to send with transaction' })
  @Column('decimal', { precision: 18, scale: 0, default: 0 })
  value: string;

  @ApiProperty({ description: 'IPFS hash of action data' })
  @Column()
  dataHash: string;

  @ApiProperty({ description: 'Required number of approvals' })
  @Column('int', { default: 1 })
  requiredApprovals: number;

  @ApiProperty({ description: 'Creation date' })
  @Column('timestamp')
  createdDate: Date;

  @ApiProperty({ description: 'Approval date' })
  @Column('timestamp', { nullable: true })
  approvedDate?: Date;

  @ApiProperty({ description: 'Execution date' })
  @Column('timestamp', { nullable: true })
  executedDate?: Date;

  @ApiProperty({ description: 'Rejection date' })
  @Column('timestamp', { nullable: true })
  rejectedDate?: Date;

  @ApiProperty({ description: 'Cancellation date' })
  @Column('timestamp', { nullable: true })
  cancelledAt?: Date;

  @ApiProperty({ description: 'Cancellation by' })
  @Column({ nullable: true })
  cancelledBy?: string;

  @ApiProperty({ description: 'Executor address' })
  @Column({ nullable: true })
  executorAddress?: string;

  @ApiProperty({ description: 'Execution transaction hash' })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Multi-sig transaction ID' })
  @Column({ nullable: true })
  multiSigTransactionId?: string;

  @ApiProperty({ description: 'Multi-sig confirmations' })
  @Column('simple-array', { nullable: true })
  multiSigConfirmations?: string[];

  @ApiProperty({ description: 'Multi-sig confirmation count' })
  @Column('int', { default: 0 })
  multiSigConfirmationCount: number;

  @ApiProperty({ description: 'Addresses that approved this action' })
  @Column('simple-array', { default: '' })
  approvals: string[];

  @ApiProperty({ description: 'Addresses that rejected this action' })
  @Column('simple-array', { default: '' })
  rejections: string[];

  @ApiProperty({ description: 'Rejection reason' })
  @Column('text', { nullable: true })
  rejectionReason?: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Approver notes' })
  @Column('text', { nullable: true })
  approverNotes?: string;

  @ApiProperty({ description: 'Execution notes' })
  @Column('text', { nullable: true })
  executionNotes?: string;

  @ApiProperty({ description: 'Approval comments by address' })
  @Column('jsonb', { nullable: true })
  approvalComments?: Record<string, string>;

  @ApiProperty({ description: 'Rejection comments by address' })
  @Column('jsonb', { nullable: true })
  rejectionComments?: Record<string, string>;

  @ApiProperty({ description: 'Additional metadata' })
  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  get canApprove(): boolean {
    return this.status === AdminActionStatus.PENDING;
  }

  get canReject(): boolean {
    return this.status === AdminActionStatus.PENDING;
  }

  get canExecute(): boolean {
    return this.status === AdminActionStatus.APPROVED && !this.executionTransactionHash;
  }

  get canCancel(): boolean {
    return this.status !== AdminActionStatus.EXECUTED;
  }

  get isActive(): boolean {
    return [AdminActionStatus.PENDING, AdminActionStatus.APPROVED].includes(this.status);
  }

  get approvalCount(): number {
    return this.approvals.length;
  }

  get rejectionCount(): number {
    return this.rejections.length;
  }

  get processingDays(): number {
    if (!this.executedDate) return 0;
    const createdDate = new Date(this.createdDate);
    const executedDate = new Date(this.executedDate);
    const diffTime = Math.abs(executedDate.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get approvalDays(): number {
    if (!this.approvedDate) return 0;
    const createdDate = new Date(this.createdDate);
    const approvedDate = new Date(this.approvedDate);
    const diffTime = Math.abs(approvedDate.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
