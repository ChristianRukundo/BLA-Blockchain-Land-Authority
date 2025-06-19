import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from './user-role.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginAttempt } from './login-attempt.entity';
import { Exclude } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  BANNED = 'BANNED',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  WALLET = 'WALLET',
}

@Entity('users')
@Index(['walletAddress'], { unique: true, where: 'wallet_address IS NOT NULL' })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_address', nullable: true, unique: true })
  @Index()
  walletAddress: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  username: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @Column({ name: 'provider_id', nullable: true })
  providerId: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', nullable: true })
  @Exclude({ toPlainOnly: true })
  emailVerificationToken: string;

  @Column({ name: 'email_verification_expires', nullable: true })
  emailVerificationExpires: Date;

  @Column({ name: 'password_reset_token', nullable: true })
  @Exclude({ toPlainOnly: true })
  passwordResetToken: string;

  @Column({ name: 'password_reset_expires', nullable: true })
  passwordResetExpires: Date;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', nullable: true })
  @Exclude({ toPlainOnly: true })
  twoFactorSecret: string;

  @Column({ name: 'two_factor_temp_secret', nullable: true })
  @Exclude({ toPlainOnly: true })
  twoFactorTempSecret: string;

  @Column('simple-array', { nullable: true })
  twoFactorBackupCodes: string[];

  @Column({ name: 'last_login_ip', nullable: true })
  lastLoginIp: string;

  @Column({ name: 'last_login_user_agent', nullable: true })
  lastLoginUserAgent: string;

  @Column({ name: 'last_login_date', nullable: true })
  lastLoginDate: Date;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'last_active', nullable: true })
  lastActive: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil: Date;

  @Column('jsonb', { nullable: true })
  preferences: any;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column({ name: 'terms_accepted', default: false })
  termsAccepted: boolean;

  @Column({ name: 'terms_accepted_at', nullable: true })
  termsAcceptedAt: Date;

  @Column({ name: 'privacy_accepted', default: false })
  privacyAccepted: boolean;

  @Column({ name: 'privacy_accepted_at', nullable: true })
  privacyAcceptedAt: Date;

  @Column({ name: 'marketing_consent', default: false })
  marketingConsent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToMany(() => UserRole, role => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles_mapping',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: UserRole[];

  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => LoginAttempt, attempt => attempt.user)
  loginAttempts: LoginAttempt[];

  // Virtual properties
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.username || this.walletAddress || 'Unknown User';
  }

  get isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.isLocked;
  }

  get roleNames(): string[] {
    return this.roles?.map(role => role.name) || [];
  }

  get hasWallet(): boolean {
    return !!this.walletAddress;
  }

  get hasEmail(): boolean {
    return !!this.email && this.emailVerified;
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }

  hasRole(roleName: string): boolean {
    return this.roles?.some(role => role.name === roleName) || false;
  }

  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(roleName => this.hasRole(roleName));
  }

  hasPermission(permission: string): boolean {
    return this.roles?.some(role => role.permissions?.includes(permission)) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
  }
  updateLastLogin(): void {
    this.lastLoginDate = new Date();
    this.loginCount++;
    this.resetFailedAttempts();
  }

  updateLastActive(date: Date = new Date()): void {
    this.lastActive = date;
  }

  generateEmailVerificationToken(): string {
    this.emailVerificationToken = this.generateRandomToken();
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return this.emailVerificationToken;
  }

  generatePasswordResetToken(): string {
    this.passwordResetToken = this.generateRandomToken();
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return this.passwordResetToken;
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationExpires = null;

    if (this.status === UserStatus.PENDING) {
      this.status = UserStatus.ACTIVE;
    }
  }

  resetPassword(newPassword: string): void {
    this.password = newPassword; // Will be hashed by @BeforeUpdate
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
  }

  acceptTerms(): void {
    this.termsAccepted = true;
    this.termsAcceptedAt = new Date();
  }

  acceptPrivacy(): void {
    this.privacyAccepted = true;
    this.privacyAcceptedAt = new Date();
  }

  setMarketingConsent(consent: boolean): void {
    this.marketingConsent = consent;
  }

  updatePreferences(preferences: any): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  private generateRandomToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  // Serialization
  toJSON() {
    const {
      password,
      emailVerificationToken,
      passwordResetToken,
      twoFactorSecret,
      twoFactorTempSecret,
      twoFactorBackupCodes,
      lastLoginIp,
      lastLoginUserAgent,
      lastLoginDate,
      ...result
    } = this;
    return result;
  }
}
