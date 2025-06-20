import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum InheritanceStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

@Entity('inheritances')
export class Inheritance {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Land parcel ID' })
  @Column()
  parcelId: string;

  @ApiProperty({ description: 'Current owner wallet address' })
  @Column()
  ownerAddress: string;

  @ApiProperty({ description: 'Designated heir wallet address' })
  @Column()
  designatedHeir: string;

  @ApiProperty({ description: 'Inheritance status', enum: InheritanceStatus })
  @Column({
    type: 'enum',
    enum: InheritanceStatus,
    default: InheritanceStatus.PENDING,
  })
  status: InheritanceStatus;

  @ApiProperty({ description: 'Creation date' })
  @Column('timestamp')
  creationDate: Date;

  @ApiProperty({ description: 'Activation date' })
  @Column('timestamp', { nullable: true })
  activationDate?: Date;

  @ApiProperty({ description: 'Expiration date' })
  @Column('timestamp', { nullable: true })
  expirationDate?: Date;

  @ApiProperty({ description: 'Cancellation date' })
  @Column('timestamp', { nullable: true })
  cancellationDate?: Date;

  @ApiProperty({ description: 'Completion date' })
  @Column('timestamp', { nullable: true })
  completionDate?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Transaction hash for creation' })
  @Column({ nullable: true })
  creationTransactionHash?: string;

  @ApiProperty({ description: 'Transaction hash for activation' })
  @Column({ nullable: true })
  activationTransactionHash?: string;

  @ApiProperty({ description: 'Transaction hash for cancellation' })
  @Column({ nullable: true })
  cancellationTransactionHash?: string;

  @ApiProperty({ description: 'Transaction hash for completion' })
  @Column({ nullable: true })
  completionTransactionHash?: string;

  @ApiProperty({ description: 'Additional notes' })
  @Column('text', { nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  get isActive(): boolean {
    return this.status === InheritanceStatus.ACTIVE;
  }

  get canCancel(): boolean {
    return [InheritanceStatus.PENDING, InheritanceStatus.ACTIVE].includes(this.status);
  }

  get canComplete(): boolean {
    return this.status === InheritanceStatus.ACTIVE;
  }

  get daysActive(): number {
    if (!this.activationDate) return 0;
    const now = new Date();
    const activationDate = new Date(this.activationDate);
    const diffTime = Math.abs(now.getTime() - activationDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilExpiration(): number {
    if (!this.expirationDate) return -1;
    const now = new Date();
    const expDate = new Date(this.expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
