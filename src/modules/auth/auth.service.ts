import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as ethers from 'ethers';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus, AuthProvider } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt, LoginAttemptResult, LoginMethod } from './entities/login-attempt.entity';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification.enum';
import * as geoip from 'geoip-lite';
import * as UAParser from 'ua-parser-js';
import {
  RegisterDto,
  LoginDto,
  WalletLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  Enable2FADto,
  Verify2FADto,
  UpdateProfileDto,
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  LoginAttemptQueryDto,
  RoleDto,
  UpdateRoleDto,
  AssignRoleDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(UserRole)
    private readonly roleRepository: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  

  async register(registerDto: RegisterDto, ipAddress: string, userAgent?: string): Promise<any> {
    this.logger.log(`Registration attempt for: ${registerDto.email || registerDto.walletAddress}`);

    
    if (!registerDto.email && !registerDto.walletAddress) {
      throw new BadRequestException('Either email or wallet address is required');
    }

    if (registerDto.email && !registerDto.password) {
      throw new BadRequestException('Password is required for email registration');
    }

    
    const existingUser = await this.findExistingUser(registerDto.email, registerDto.walletAddress);
    if (existingUser) {
      throw new ConflictException('User already exists with this email or wallet address');
    }

    
    const user = this.userRepository.create({
      ...registerDto,
      provider: registerDto.walletAddress ? AuthProvider.WALLET : AuthProvider.LOCAL,
      status: registerDto.email ? UserStatus.PENDING : UserStatus.ACTIVE,
    });

    
    if (registerDto.email) {
      user.generateEmailVerificationToken();
    }

    
    const defaultRole = await this.roleRepository.findOne({ where: { name: 'USER' } });
    if (defaultRole) {
      user.roles = [defaultRole];
    }

    const savedUser = await this.userRepository.save(user);

    
    await this.logLoginAttempt({
      userId: savedUser.id,
      emailOrWallet: registerDto.email || registerDto.walletAddress,
      method: registerDto.walletAddress ? LoginMethod.WALLET_SIGNATURE : LoginMethod.EMAIL_PASSWORD,
      result: LoginAttemptResult.SUCCESS,
      ipAddress,
      userAgent,
      walletAddress: registerDto.walletAddress,
    });

    
    if (savedUser.status === UserStatus.ACTIVE) {
      const tokens = await this.generateTokens(savedUser, ipAddress, userAgent);
      return {
        user: savedUser,
        ...tokens,
        emailVerificationRequired: false,
      };
    }

    return {
      user: savedUser,
      emailVerificationRequired: true,
      emailVerificationToken: savedUser.emailVerificationToken,
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent?: string): Promise<any> {
    this.logger.log(`Login attempt for: ${loginDto.email || loginDto.walletAddress}`);

    let user: User;
    let loginMethod: LoginMethod;

    
    if (loginDto.walletAddress && loginDto.signature) {
      user = await this.validateWalletLogin(loginDto);
      loginMethod = LoginMethod.WALLET_SIGNATURE;
    } else if (loginDto.email && loginDto.password) {
      user = await this.validateEmailLogin(loginDto);
      loginMethod = LoginMethod.EMAIL_PASSWORD;
    } else {
      throw new BadRequestException('Invalid login credentials provided');
    }

    
    if (user.isLocked) {
      await this.logLoginAttempt({
        userId: user.id,
        emailOrWallet: loginDto.email || loginDto.walletAddress,
        method: loginMethod,
        result: LoginAttemptResult.FAILED_ACCOUNT_LOCKED,
        ipAddress,
        userAgent,
        failureReason: 'Account is locked due to too many failed attempts',
      });
      throw new UnauthorizedException('Account is temporarily locked');
    }

    
    if (!user.isActive) {
      const result = user.status === UserStatus.SUSPENDED 
        ? LoginAttemptResult.FAILED_ACCOUNT_SUSPENDED
        : LoginAttemptResult.FAILED_EMAIL_NOT_VERIFIED;
      
      await this.logLoginAttempt({
        userId: user.id,
        emailOrWallet: loginDto.email || loginDto.walletAddress,
        method: loginMethod,
        result,
        ipAddress,
        userAgent,
        failureReason: `Account status: ${user.status}`,
      });
      
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    
    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          twoFactorRequired: true,
          tempToken: this.generateTempToken(user.id),
        };
      }

      const isValid2FA = await this.verify2FA(user, loginDto.twoFactorCode);
      if (!isValid2FA) {
        await this.logLoginAttempt({
          userId: user.id,
          emailOrWallet: loginDto.email || loginDto.walletAddress,
          method: LoginMethod.TWO_FACTOR,
          result: LoginAttemptResult.FAILED_TWO_FACTOR,
          ipAddress,
          userAgent,
          failureReason: 'Invalid 2FA code',
        });
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    
    user.updateLastLogin();
    await this.userRepository.save(user);

    
    const tokens = await this.generateTokens(user, ipAddress, userAgent, loginDto.deviceId, loginDto.deviceName);

    
    await this.logLoginAttempt({
      userId: user.id,
      emailOrWallet: loginDto.email || loginDto.walletAddress,
      method: loginMethod,
      result: LoginAttemptResult.SUCCESS,
      ipAddress,
      userAgent,
      deviceId: loginDto.deviceId,
      deviceName: loginDto.deviceName,
      walletAddress: loginDto.walletAddress,
    });

    return {
      user,
      ...tokens,
    };
  }

  async walletLogin(walletLoginDto: WalletLoginDto, ipAddress: string, userAgent?: string): Promise<any> {
    const user = await this.validateWalletLogin(walletLoginDto);
    
    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    user.updateLastLogin();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    await this.logLoginAttempt({
      userId: user.id,
      emailOrWallet: walletLoginDto.walletAddress,
      method: LoginMethod.WALLET_SIGNATURE,
      result: LoginAttemptResult.SUCCESS,
      ipAddress,
      userAgent,
      walletAddress: walletLoginDto.walletAddress,
      signatureMessage: walletLoginDto.message,
    });

    return { user, ...tokens };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress: string, userAgent?: string): Promise<any> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenDto.refreshToken },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = refreshToken.user;
    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    
    refreshToken.revoke('Replaced by new token', user.id, ipAddress);
    await this.refreshTokenRepository.save(refreshToken);

    
    const tokens = await this.generateTokens(user, ipAddress, userAgent, refreshTokenDto.deviceId);

    
    await this.logLoginAttempt({
      userId: user.id,
      emailOrWallet: user.email || user.walletAddress,
      method: LoginMethod.REFRESH_TOKEN,
      result: LoginAttemptResult.SUCCESS,
      ipAddress,
      userAgent,
      deviceId: refreshTokenDto.deviceId,
    });

    return { user, ...tokens };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const token = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, userId },
      });
      
      if (token) {
        token.revoke('User logout');
        await this.refreshTokenRepository.save(token);
      }
    } else {
      
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: 'User logout all devices' }
      );
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: 'User logout all devices' }
    );
  }

  

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Account is not active');
    }

    
    const resetToken = user.generatePasswordResetToken();
    await this.userRepository.save(user);

    
    this.logger.log(`Password reset token for ${user.email}: ${resetToken}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: resetPasswordDto.token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    
    user.resetPassword(resetPasswordDto.newPassword);
    await this.userRepository.save(user);

    
    await this.refreshTokenRepository.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: 'Password reset' }
    );
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    
    const isValidPassword = await user.validatePassword(changePasswordDto.currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    
    user.resetPassword(changePasswordDto.newPassword);
    await this.userRepository.save(user);

    
    if (changePasswordDto.revokeAllSessions) {
      await this.refreshTokenRepository.update(
        { userId: user.id, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: 'Password changed' }
      );
    }
  }

  

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: verifyEmailDto.token,
        emailVerificationExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    user.verifyEmail();
    await this.userRepository.save(user);
  }

  async resendVerificationEmail(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = user.generateEmailVerificationToken();
    await this.userRepository.save(user);

    
    this.logger.log(`Email verification token for ${user.email}: ${token}`);

    return token;
  }

  

  /**
   * Generates a new 2FA secret for a user and returns the secret and QR code URL
   * @param userId The user ID
   * @returns The 2FA secret and QR code URL
   */
  async generate2FASecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    
    const secret = speakeasy.generateSecret({
      name: `RwaLandChain:${user.email || user.walletAddress}`,
      issuer: 'RwaLandChain',
      length: 20, 
    });

    
    user.twoFactorTempSecret = secret.base32;
    await this.userRepository.save(user);

    
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    
    const backupCodes = this.generateBackupCodes();
    
    
    user.twoFactorBackupCodes = await Promise.all(
      backupCodes.map(async (code) => await bcrypt.hash(code, 10))
    );
    await this.userRepository.save(user);

    
    if (user.email) {
      try {
        await this.emailService.send2FASetupEmail(
          user.email,
          user.firstName || user.username || 'User',
          qrCodeUrl,
          secret.base32,
          backupCodes
        );

        
        await this.notificationService.createNotification({
          userId: user.id,
          type: NotificationType.TWO_FACTOR_ENABLED,
          title: '2FA Setup Initiated',
          data: { 
            timestamp: new Date().toISOString(),
            ip: user.lastLoginIp,
            device: user.lastLoginUserAgent,
          },
        });

        this.logger.log(`2FA setup email sent to user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to send 2FA setup email to user ${userId}:`, error);
        
      }
    }

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  /**
   * Generates backup codes for 2FA
   * @param count Number of backup codes to generate
   * @param length Length of each backup code
   * @returns Array of backup codes
   */
  private generateBackupCodes(count = 10, length = 8): string[] {
    const codes: string[] = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < length; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      code = `${code.substring(0, 4)}-${code.substring(4)}`;
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Enables 2FA for a user
   * @param userId The user ID
   * @param enable2FADto The 2FA setup data
   * @returns Array of backup codes
   */
  async enable2FA(userId: string, enable2FADto: Enable2FADto): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorTempSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: enable2FADto.code,
      window: 1, 
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    
    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    await this.userRepository.save(user);

    
    let backupCodes = enable2FADto.backupCodes;
    if (!backupCodes || backupCodes.length === 0) {
      backupCodes = this.generateBackupCodes();
      
      
      user.twoFactorBackupCodes = await Promise.all(
        backupCodes.map(async (code) => await bcrypt.hash(code, 10))
      );
      await this.userRepository.save(user);
    }

    
    await this.notificationService.createNotification({
      userId: user.id,
      type: NotificationType.TWO_FACTOR_ENABLED,
      title: '2FA Enabled',
      data: { 
        timestamp: new Date().toISOString(),
        ip: user.lastLoginIp,
        device: user.lastLoginUserAgent,
      },
    });

    
    if (user.email) {
      try {
        await this.emailService.sendEmail(
          user.email,
          '2FA Enabled on Your Account',
          'login-alert',
          {
            name: user.firstName || user.username || 'User',
            message: 'Two-factor authentication has been enabled for your account. Your account is now more secure.',
            ipAddress: user.lastLoginIp || 'Unknown',
            location: this.getLocationFromIp(user.lastLoginIp) || 'Unknown',
            deviceInfo: user.lastLoginUserAgent || 'Unknown',
            loginTime: new Date().toLocaleString(),
            securitySettingsUrl: `${this.configService.get('email.appUrl')}/settings/security`,
          }
        );
      } catch (error) {
        this.logger.error(`Failed to send 2FA enabled email to user ${userId}:`, error);
        
      }
    }

    return backupCodes;
  }

  /**
   * Disables 2FA for a user
   * @param userId The user ID
   * @param verificationCode The verification code
   */
  async disable2FA(userId: string, verificationCode: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verificationCode,
      window: 1, 
    });

    if (!verified) {
      
      const isValidBackupCode = await this.validateBackupCode(user, verificationCode);
      if (!isValidBackupCode) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await this.userRepository.save(user);

    
    await this.notificationService.createNotification({
      userId: user.id,
      type: NotificationType.TWO_FACTOR_DISABLED,
      title: '2FA Disabled',

      data: { 
        timestamp: new Date().toISOString(),
        ip: user.lastLoginIp,
        device: user.lastLoginUserAgent,
      },
    });

    
    if (user.email) {
      try {
        await this.emailService.sendEmail(
          user.email,
          '2FA Disabled on Your Account',
          'login-alert',
          {
            name: user.firstName || user.username || 'User',
            message: 'Two-factor authentication has been disabled for your account. If you did not make this change, please contact support immediately.',
            ipAddress: user.lastLoginIp || 'Unknown',
            location: this.getLocationFromIp(user.lastLoginIp) || 'Unknown',
            deviceInfo: user.lastLoginUserAgent || 'Unknown',
            loginTime: new Date().toLocaleString(),
            securitySettingsUrl: `${this.configService.get('email.appUrl')}/settings/security`,
          }
        );
      } catch (error) {
        this.logger.error(`Failed to send 2FA disabled email to user ${userId}:`, error);
        
      }
    }
  }

  /**
   * Validates a 2FA backup code
   * @param user The user
   * @param code The backup code
   * @returns Whether the backup code is valid
   */
  private async validateBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
      return false;
    }

    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const isValid = await bcrypt.compare(code, user.twoFactorBackupCodes[i]);
      if (isValid) {
        
        user.twoFactorBackupCodes.splice(i, 1);
        await this.userRepository.save(user);
        return true;
      }
    }

    return false;
  }

  /**
   * Gets location information from an IP address
   * @param ip The IP address
   * @returns Location string
   */
  private getLocationFromIp(ip: string): string | null {
    if (!ip || ip === 'localhost' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
      return 'Local Network';
    }
    
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        return `${geo.city || ''}, ${geo.region || ''}, ${geo.country || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '');
      }
    } catch (error) {
      this.logger.error(`Failed to get location from IP ${ip}:`, error);
    }
    
    return null;
  }

  /**
   * Gets device information from a user agent string
   * @param userAgent The user agent string
   * @returns Device information string
   */
  // private getDeviceInfo(userAgent: string): string {
  //   if (!userAgent) {
  //     return 'Unknown Device';
  //   }
    
  //   try {
  //     const parser = new UAParser(userAgent);
  //     const result = parser.getResult();
  //     return `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'} ${result.os.version || ''}`;
  //   } catch (error) {
  //     this.logger.error(`Failed to parse user agent ${userAgent}:`, error);
  //     return 'Unknown Device';
  //   }
  // }

  async verify2FA(user: User, token: string): Promise<boolean> {
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });
  }

  async confirm2FA(userId: string, verify2FADto: Verify2FADto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await this.verify2FA(user, verify2FADto.token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);
  }

  

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateProfileDto);
    return this.userRepository.save(user);
  }

  async getUsers(query: UserQueryDto): Promise<any> {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.createdAt', 'DESC');

    if (query.search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search OR user.walletAddress ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.provider) {
      queryBuilder.andWhere('user.provider = :provider', { provider: query.provider });
    }

    if (query.emailVerified !== undefined) {
      queryBuilder.andWhere('user.emailVerified = :emailVerified', { emailVerified: query.emailVerified });
    }

    if (query.role) {
      queryBuilder.andWhere('roles.name = :role', { role: query.role });
    }

    if (query.fromDate) {
      queryBuilder.andWhere('user.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      queryBuilder.andWhere('user.createdAt <= :toDate', { toDate: query.toDate });
    }

    const [users, total] = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findExistingUser(createUserDto.email, createUserDto.walletAddress);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    let roles: UserRole[] = [];
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      roles = await this.roleRepository.findBy({ 
        name: In(createUserDto.roles) 
      });
    } else {
      const defaultRole = await this.roleRepository.findOne({ where: { name: 'USER' } });
      if (defaultRole) {
        roles = [defaultRole];
      }
    }

    const user = this.userRepository.create({
      ...createUserDto,
      status: createUserDto.status || UserStatus.ACTIVE,
      emailVerified: createUserDto.emailVerified || false,
      roles,
    });

    return this.userRepository.save(user);
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);

    if (updateUserDto.roles) {
      const roles = await this.roleRepository.findByIds(updateUserDto.roles);
      user.roles = roles;
    }

    return this.userRepository.save(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.userRepository.delete(userId);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  

  async getRoles(): Promise<UserRole[]> {
    return this.roleRepository.find({ order: { priority: 'ASC', name: 'ASC' } });
  }

  async createRole(roleDto: RoleDto): Promise<UserRole> {
    const existingRole = await this.roleRepository.findOne({ where: { name: roleDto.name } });
    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    const role = this.roleRepository.create(roleDto);
    return this.roleRepository.save(role);
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto): Promise<UserRole> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot delete system role');
    }

    if (role.users && role.users.length > 0) {
      throw new BadRequestException('Cannot delete role with assigned users');
    }

    await this.roleRepository.delete(roleId);
  }

  async assignRoles(assignRoleDto: AssignRoleDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: assignRoleDto.userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.roleRepository.find({
      where: assignRoleDto.roleNames.map(name => ({ name })),
    });

    user.roles = roles;
    return this.userRepository.save(user);
  }

  

  async getLoginAttempts(query: LoginAttemptQueryDto): Promise<any> {
    const queryBuilder = this.loginAttemptRepository.createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.user', 'user')
      .orderBy('attempt.createdAt', 'DESC');

    if (query.userId) {
      queryBuilder.andWhere('attempt.userId = :userId', { userId: query.userId });
    }

    if (query.ipAddress) {
      queryBuilder.andWhere('attempt.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.method) {
      queryBuilder.andWhere('attempt.method = :method', { method: query.method });
    }

    if (query.successOnly) {
      queryBuilder.andWhere('attempt.result = :result', { result: LoginAttemptResult.SUCCESS });
    }

    if (query.failedOnly) {
      queryBuilder.andWhere('attempt.result != :result', { result: LoginAttemptResult.SUCCESS });
    }

    if (query.suspiciousOnly) {
      queryBuilder.andWhere('attempt.suspiciousActivity = :suspicious', { suspicious: true });
    }

    if (query.fromDate) {
      queryBuilder.andWhere('attempt.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      queryBuilder.andWhere('attempt.createdAt <= :toDate', { toDate: query.toDate });
    }

    const [attempts, total] = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: attempts,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  

  private async findExistingUser(email?: string, walletAddress?: string): Promise<User | null> {
    if (email && walletAddress) {
      return this.userRepository.findOne({
        where: [{ email }, { walletAddress }],
      });
    } else if (email) {
      return this.userRepository.findOne({ where: { email } });
    } else if (walletAddress) {
      return this.userRepository.findOne({ where: { walletAddress } });
    }
    return null;
  }

  private async validateEmailLogin(loginDto: LoginDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await user.validatePassword(loginDto.password);
    if (!isValidPassword) {
      user.incrementFailedAttempts();
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async validateWalletLogin(loginDto: WalletLoginDto | LoginDto): Promise<User> {
    const walletAddress = (loginDto as WalletLoginDto).walletAddress ?? (loginDto as LoginDto).walletAddress;
    const signature = (loginDto as WalletLoginDto).signature ?? (loginDto as LoginDto).signature;
    const message = (loginDto as WalletLoginDto).message ?? (loginDto as LoginDto).message;

    if (!walletAddress || !signature || !message) {
      throw new BadRequestException('Wallet address, signature, and message are required');
    }

    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid signature');
    }

    
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(
    user: User,
    ipAddress: string,
    userAgent?: string,
    deviceId?: string,
    deviceName?: string,
  ): Promise<{ accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }> {
    const payload = {
      sub: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      roles: user.roleNames,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');

    
    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
      createdByIp: ipAddress,
      userAgent,
      deviceId,
      deviceName,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      tokenType: 'Bearer',
      expiresIn: 3600, 
    };
  }

  private generateTempToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, temp: true },
      { expiresIn: '5m' }
    );
  }

  private async logLoginAttempt(data: Partial<LoginAttempt>): Promise<void> {
    try {
      const attempt = this.loginAttemptRepository.create(data);
      await this.loginAttemptRepository.save(attempt);
    } catch (error) {
      this.logger.error('Failed to log login attempt:', error);
    }
  }
}