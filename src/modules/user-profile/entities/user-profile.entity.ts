import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProfileStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('user_profiles')
@Index(['walletAddress'], { unique: true })
@Index(['nationalId'], { unique: true, where: 'national_id IS NOT NULL' })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42, unique: true })
  @Index()
  walletAddress: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ name: 'national_id', type: 'varchar', length: 50, nullable: true, unique: true })
  nationalId?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province?: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation?: string;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl?: string;

  @Column({
    type: 'enum',
    enum: ProfileStatus,
    default: ProfileStatus.ACTIVE,
  })
  status: ProfileStatus;

  @Column({
    name: 'kyc_status',
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.NOT_STARTED,
  })
  kycStatus: KYCStatus;

  @Column({ name: 'kyc_completed_at', type: 'timestamp', nullable: true })
  kycCompletedAt?: Date;

  @Column({ name: 'kyc_documents', type: 'jsonb', nullable: true })
  kycDocuments?: {
    nationalIdFront?: string;
    nationalIdBack?: string;
    proofOfAddress?: string;
    selfie?: string;
    additionalDocuments?: string[];
  };

  @Column({ name: 'verification_level', type: 'int', default: 0 })
  verificationLevel: number; // 0: Basic, 1: Intermediate, 2: Advanced

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'preferred_language', type: 'varchar', length: 10, default: 'en' })
  preferredLanguage: string;

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    landTransfers: boolean;
    complianceAlerts: boolean;
    disputeUpdates: boolean;
    governanceProposals: boolean;
    inheritanceNotifications: boolean;
    expropriationNotices: boolean;
  };

  @Column({ name: 'privacy_settings', type: 'jsonb', nullable: true })
  privacySettings?: {
    profileVisibility: 'public' | 'private' | 'contacts_only';
    showLandHoldings: boolean;
    showTransactionHistory: boolean;
    allowDataSharing: boolean;
  };

  @Column({ name: 'land_holdings_count', type: 'int', default: 0 })
  landHoldingsCount: number;

  @Column({ name: 'total_land_area', type: 'decimal', precision: 15, scale: 6, default: 0 })
  totalLandArea: number;

  @Column({ name: 'governance_token_balance', type: 'decimal', precision: 30, scale: 18, default: 0 })
  governanceTokenBalance: string;

  @Column({ name: 'eco_credits_balance', type: 'decimal', precision: 30, scale: 18, default: 0 })
  ecoCreditsBalance: string;

  @Column({ name: 'mock_rwf_balance', type: 'decimal', precision: 30, scale: 18, default: 0 })
  mockRwfBalance: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_activity_at', type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ name: 'terms_accepted_at', type: 'timestamp', nullable: true })
  termsAcceptedAt?: Date;

  @Column({ name: 'privacy_policy_accepted_at', type: 'timestamp', nullable: true })
  privacyPolicyAcceptedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual properties
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || '';
  }

  get isKycCompleted(): boolean {
    return this.kycStatus === KYCStatus.COMPLETED;
  }

  get isFullyVerified(): boolean {
    return this.isKycCompleted && this.isEmailVerified && this.verificationLevel >= 2;
  }

  get hasBasicProfile(): boolean {
    return !!(this.firstName && this.lastName && this.email);
  }

  get profileCompleteness(): number {
    const fields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'nationalId',
      'dateOfBirth',
      'address',
      'city',
      'province',
      'country',
      'occupation',
    ];

    const completedFields = fields.filter(field => !!this[field]).length;
    return Math.round((completedFields / fields.length) * 100);
  }
}
