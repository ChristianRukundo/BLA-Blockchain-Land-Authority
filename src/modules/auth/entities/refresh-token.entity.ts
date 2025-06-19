import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['token'], { unique: true })
@Index(['userId', 'isRevoked'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  token: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoked_by', nullable: true })
  revokedBy: string;

  @Column({ name: 'revoked_reason', nullable: true })
  revokedReason: string;

  @Column({ name: 'replaced_by_token', nullable: true })
  replacedByToken: string;

  @Column({ name: 'created_by_ip', nullable: true })
  createdByIp: string;

  @Column({ name: 'revoked_by_ip', nullable: true })
  revokedByIp: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isActive(): boolean {
    return !this.isRevoked && !this.isExpired;
  }

  get remainingTime(): number {
    if (this.isExpired) return 0;
    return this.expiresAt.getTime() - new Date().getTime();
  }

  get remainingDays(): number {
    return Math.floor(this.remainingTime / (1000 * 60 * 60 * 24));
  }

  // Methods
  revoke(reason?: string, revokedBy?: string, revokedByIp?: string): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
    this.revokedBy = revokedBy;
    this.revokedByIp = revokedByIp;
  }

  replaceWith(newToken: string): void {
    this.revoke('Replaced by new token');
    this.replacedByToken = newToken;
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}

