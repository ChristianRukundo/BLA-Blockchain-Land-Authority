import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum LoginAttemptResult {
  SUCCESS = 'SUCCESS',
  FAILED_INVALID_CREDENTIALS = 'FAILED_INVALID_CREDENTIALS',
  FAILED_ACCOUNT_LOCKED = 'FAILED_ACCOUNT_LOCKED',
  FAILED_ACCOUNT_SUSPENDED = 'FAILED_ACCOUNT_SUSPENDED',
  FAILED_EMAIL_NOT_VERIFIED = 'FAILED_EMAIL_NOT_VERIFIED',
  FAILED_TWO_FACTOR = 'FAILED_TWO_FACTOR',
  FAILED_RATE_LIMITED = 'FAILED_RATE_LIMITED',
  FAILED_INVALID_SIGNATURE = 'FAILED_INVALID_SIGNATURE',
  FAILED_WALLET_NOT_CONNECTED = 'FAILED_WALLET_NOT_CONNECTED',
  FAILED_OTHER = 'FAILED_OTHER',
}

export enum LoginMethod {
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  WALLET_SIGNATURE = 'WALLET_SIGNATURE',
  GOOGLE_OAUTH = 'GOOGLE_OAUTH',
  GITHUB_OAUTH = 'GITHUB_OAUTH',
  TWO_FACTOR = 'TWO_FACTOR',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
}

@Entity('login_attempts')
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['result', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'email_or_wallet', nullable: true })
  emailOrWallet: string;

  @Column({
    type: 'enum',
    enum: LoginMethod,
  })
  method: LoginMethod;

  @Column({
    type: 'enum',
    enum: LoginAttemptResult,
  })
  result: LoginAttemptResult;

  @Column({ name: 'ip_address' })
  @Index()
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ name: 'wallet_address', nullable: true })
  walletAddress: string;

  @Column({ name: 'signature_message', nullable: true })
  signatureMessage: string;

  @Column({ name: 'oauth_provider', nullable: true })
  oauthProvider: string;

  @Column({ name: 'oauth_provider_id', nullable: true })
  oauthProviderId: string;

  @Column({ name: 'two_factor_method', nullable: true })
  twoFactorMethod: string;

  @Column({ name: 'blocked_by_rate_limit', default: false })
  blockedByRateLimit: boolean;

  @Column({ name: 'suspicious_activity', default: false })
  suspiciousActivity: boolean;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.loginAttempts, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual properties
  get isSuccess(): boolean {
    return this.result === LoginAttemptResult.SUCCESS;
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  get isWalletLogin(): boolean {
    return this.method === LoginMethod.WALLET_SIGNATURE;
  }

  get isEmailLogin(): boolean {
    return this.method === LoginMethod.EMAIL_PASSWORD;
  }

  get isOAuthLogin(): boolean {
    return this.method === LoginMethod.GOOGLE_OAUTH || this.method === LoginMethod.GITHUB_OAUTH;
  }

  get isTwoFactorLogin(): boolean {
    return this.method === LoginMethod.TWO_FACTOR;
  }

  get isRefreshTokenLogin(): boolean {
    return this.method === LoginMethod.REFRESH_TOKEN;
  }

  // Methods
  markAsSuspicious(reason?: string): void {
    this.suspiciousActivity = true;
    if (reason) {
      this.metadata = { ...this.metadata, suspiciousReason: reason };
    }
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  setLocation(location: string): void {
    this.location = location;
  }

  setDeviceInfo(deviceId: string, deviceName?: string): void {
    this.deviceId = deviceId;
    this.deviceName = deviceName;
  }
}

