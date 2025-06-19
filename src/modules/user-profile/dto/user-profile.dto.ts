import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  IsNumber,
  IsPhoneNumber,
  Length,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ProfileStatus, KYCStatus } from '../entities/user-profile.entity';

export class CreateUserProfileDto {
  @ApiProperty({ description: 'Wallet address (Ethereum format)' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum wallet address format' })
  walletAddress: string;

  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({ description: 'National ID number', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  nationalId?: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Gender', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  gender?: string;

  @ApiProperty({ description: 'Physical address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiProperty({ description: 'Province/State', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  province?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  postalCode?: string;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @ApiProperty({ description: 'Occupation', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  occupation?: string;

  @ApiProperty({ description: 'Profile image URL', required: false })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiProperty({ description: 'Preferred language', required: false, default: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  preferredLanguage?: string;

  @ApiProperty({ description: 'Notification preferences', required: false })
  @IsOptional()
  @IsObject()
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

  @ApiProperty({ description: 'Privacy settings', required: false })
  @IsOptional()
  @IsObject()
  privacySettings?: {
    profileVisibility: 'public' | 'private' | 'contacts_only';
    showLandHoldings: boolean;
    showTransactionHistory: boolean;
    allowDataSharing: boolean;
  };

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateUserProfileDto extends PartialType(CreateUserProfileDto) {
  @ApiProperty({ description: 'Wallet address cannot be updated', required: false })
  override walletAddress?: never; 
}

export class UpdateKYCDto {
  @ApiProperty({ description: 'KYC status', enum: KYCStatus })
  @IsEnum(KYCStatus)
  kycStatus: KYCStatus;

  @ApiProperty({ description: 'KYC documents', required: false })
  @IsOptional()
  @IsObject()
  kycDocuments?: {
    nationalIdFront?: string;
    nationalIdBack?: string;
    proofOfAddress?: string;
    selfie?: string;
    additionalDocuments?: string[];
  };

  @ApiProperty({ description: 'Verification level (0-2)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  verificationLevel?: number;
}

export class UpdateProfileStatusDto {
  @ApiProperty({ description: 'Profile status', enum: ProfileStatus })
  @IsEnum(ProfileStatus)
  status: ProfileStatus;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Email notifications enabled' })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ description: 'SMS notifications enabled' })
  @IsBoolean()
  sms: boolean;

  @ApiProperty({ description: 'Push notifications enabled' })
  @IsBoolean()
  push: boolean;

  @ApiProperty({ description: 'Land transfer notifications enabled' })
  @IsBoolean()
  landTransfers: boolean;

  @ApiProperty({ description: 'Compliance alert notifications enabled' })
  @IsBoolean()
  complianceAlerts: boolean;

  @ApiProperty({ description: 'Dispute update notifications enabled' })
  @IsBoolean()
  disputeUpdates: boolean;

  @ApiProperty({ description: 'Governance proposal notifications enabled' })
  @IsBoolean()
  governanceProposals: boolean;

  @ApiProperty({ description: 'Inheritance notifications enabled' })
  @IsBoolean()
  inheritanceNotifications: boolean;

  @ApiProperty({ description: 'Expropriation notice notifications enabled' })
  @IsBoolean()
  expropriationNotices: boolean;

}

export class UpdatePrivacySettingsDto {
  @ApiProperty({ description: 'Profile visibility setting' })
  @IsEnum(['public', 'private', 'contacts_only'])
  profileVisibility: 'public' | 'private' | 'contacts_only';

  @ApiProperty({ description: 'Show land holdings in profile' })
  @IsBoolean()
  showLandHoldings: boolean;

  @ApiProperty({ description: 'Show transaction history in profile' })
  @IsBoolean()
  showTransactionHistory: boolean;

  @ApiProperty({ description: 'Allow data sharing with third parties' })
  @IsBoolean()
  allowDataSharing: boolean;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'Profile ID' })
  id: string;

  @ApiProperty({ description: 'Wallet address' })
  walletAddress: string;

  @ApiProperty({ description: 'First name', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Full name (computed)', required: false })
  fullName?: string;

  @ApiProperty({ description: 'Email address', required: false })
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phoneNumber?: string;

  @ApiProperty({ description: 'National ID', required: false })
  nationalId?: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  dateOfBirth?: Date;

  @ApiProperty({ description: 'Gender', required: false })
  gender?: string;

  @ApiProperty({ description: 'Address', required: false })
  address?: string;

  @ApiProperty({ description: 'City', required: false })
  city?: string;

  @ApiProperty({ description: 'Province', required: false })
  province?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  postalCode?: string;

  @ApiProperty({ description: 'Country', required: false })
  country?: string;

  @ApiProperty({ description: 'Occupation', required: false })
  occupation?: string;

  @ApiProperty({ description: 'Profile image URL', required: false })
  profileImageUrl?: string;

  @ApiProperty({ description: 'Profile status', enum: ProfileStatus })
  status: ProfileStatus;

  @ApiProperty({ description: 'KYC status', enum: KYCStatus })
  kycStatus: KYCStatus;

  @ApiProperty({ description: 'KYC completion date', required: false })
  kycCompletedAt?: Date;

  @ApiProperty({ description: 'Verification level' })
  verificationLevel: number;

  @ApiProperty({ description: 'Email verified status' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Phone verified status' })
  isPhoneVerified: boolean;

  @ApiProperty({ description: 'Two-factor authentication enabled' })
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Preferred language' })
  preferredLanguage: string;

  @ApiProperty({ description: 'Land holdings count' })
  landHoldingsCount: number;

  @ApiProperty({ description: 'Total land area' })
  totalLandArea: number;

  @ApiProperty({ description: 'Governance token balance' })
  governanceTokenBalance: string;

  @ApiProperty({ description: 'Eco credits balance' })
  ecoCreditsBalance: string;

  @ApiProperty({ description: 'Mock RWF balance' })
  mockRwfBalance: string;

  @ApiProperty({ description: 'Last login timestamp', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Last activity timestamp', required: false })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Terms acceptance timestamp', required: false })
  termsAcceptedAt?: Date;

  @ApiProperty({ description: 'Privacy policy acceptance timestamp', required: false })
  privacyPolicyAcceptedAt?: Date;

  @ApiProperty({ description: 'Profile creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Profile last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Profile completeness percentage' })
  profileCompleteness: number;

  @ApiProperty({ description: 'KYC completion status' })
  isKycCompleted: boolean;

  @ApiProperty({ description: 'Full verification status' })
  isFullyVerified: boolean;

  @ApiProperty({ description: 'Basic profile completion status' })
  hasBasicProfile: boolean;
}

export class UserProfileListResponseDto {
  @ApiProperty({ description: 'List of user profiles', type: [UserProfileResponseDto] })
  profiles: UserProfileResponseDto[];

  @ApiProperty({ description: 'Total number of profiles' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of profiles per page' })
  limit: number;
}

export class UserProfileStatisticsDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Number of KYC completed users' })
  kycCompletedUsers: number;

  @ApiProperty({ description: 'Number of fully verified users' })
  verifiedUsers: number;

  @ApiProperty({ description: 'Users by status' })
  usersByStatus: Record<ProfileStatus, number>;

  @ApiProperty({ description: 'Users by KYC status' })
  usersByKycStatus: Record<KYCStatus, number>;
}
