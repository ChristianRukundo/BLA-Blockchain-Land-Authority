import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  IsEthereumAddress,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserStatus, AuthProvider } from '../entities/user.entity';
import { LoginMethod } from '../entities/login-attempt.entity';

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Ethereum wallet address' })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Password (required for email registration)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number/special character',
  })
  password?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Accept terms and conditions' })
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;

  @ApiPropertyOptional({ description: 'Accept privacy policy' })
  @IsOptional()
  @IsBoolean()
  acceptPrivacy?: boolean;

  @ApiPropertyOptional({ description: 'Marketing consent' })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

export class LoginDto {
  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Wallet address' })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;

  @ApiPropertyOptional({ description: 'Password (for email login)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Wallet signature (for wallet login)' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Message that was signed' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Two-factor authentication code' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  twoFactorCode?: string;

  @ApiPropertyOptional({ description: 'Remember this device' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Device ID for tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class WalletLoginDto {
  @ApiProperty({ description: 'Wallet address' })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message' })
  @IsString()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Remember this device' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number/special character',
  })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number/special character',
  })
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;
}

export class Enable2FADto {
  @ApiProperty({ description: 'Two-factor authentication code' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @ApiPropertyOptional({ description: 'Backup codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backupCodes?: string[];
}

export class Verify2FADto {
  @ApiProperty({ description: 'Two-factor authentication code' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  preferences?: any;

  @ApiPropertyOptional({ description: 'Marketing consent' })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

export class CreateUserDto extends RegisterDto {
  @ApiPropertyOptional({ enum: UserStatus, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'User roles' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'Email verified status' })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  id?: string;
}

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ enum: AuthProvider, description: 'Filter by auth provider' })
  @IsOptional()
  @IsEnum(AuthProvider)
  provider?: AuthProvider;

  @ApiPropertyOptional({ description: 'Filter by email verified status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  toDate?: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token type' })
  tokenType: string;

  @ApiProperty({ description: 'Expires in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'User information' })
  user: any;

  @ApiPropertyOptional({ description: 'Two-factor required' })
  twoFactorRequired?: boolean;

  @ApiPropertyOptional({ description: 'Two-factor secret (for setup)' })
  twoFactorSecret?: string;

  @ApiPropertyOptional({ description: 'QR code URL (for setup)' })
  qrCodeUrl?: string;
}

export class LoginAttemptQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: LoginMethod, description: 'Login method' })
  @IsOptional()
  @IsEnum(LoginMethod)
  method?: LoginMethod;

  @ApiPropertyOptional({ description: 'Success only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  successOnly?: boolean;

  @ApiPropertyOptional({ description: 'Failed only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  failedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Suspicious only' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  suspiciousOnly?: boolean;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: Date;
}

export class RoleDto {
  @ApiProperty({ description: 'Role name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'Role permissions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Role color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Role icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Role priority' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateRoleDto extends PartialType(RoleDto) {
  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role names to assign' })
  @IsArray()
  @IsString({ each: true })
  roleNames: string[];
}

