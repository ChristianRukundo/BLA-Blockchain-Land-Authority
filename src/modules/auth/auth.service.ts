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
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ethers } from 'ethers';
import { User, UserStatus, AuthProvider } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt, LoginAttemptResult, LoginMethod } from './entities/login-attempt.entity';
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
    private userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private roleRepository: Repository<UserRole>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Authentication Methods

  async register(registerDto: RegisterDto, ipAddress: string, userAgent?: string): Promise<any> {
    this.logger.log(`Registration attempt for: ${registerDto.email || registerDto.walletAddress}`);

    // Validate registration data
    if (!registerDto.email && !registerDto.walletAddress) {
      throw new BadRequestException('Either email or wallet address is required');
    }

    if (registerDto.email && !registerDto.password) {
      throw new BadRequestException('Password is required for email registration');
    }

    // Check if user already exists
    const existingUser = await this.findExistingUser(registerDto.email, registerDto.walletAddress);
    if (existingUser) {
      throw new ConflictException('User already exists with this email or wallet address');
    }

    // Create user
    const user = this.userRepository.create({
      ...registerDto,
      provider: registerDto.walletAddress ? AuthProvider.WALLET : AuthProvider.EMAIL,
      status: registerDto.email ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
    });

    // Generate email verification token if email provided
    if (registerDto.email) {
      user.generateEmailVerificationToken();
    }

    // Assign default role
    const defaultRole = await this.roleRepository.findOne({ where: { name: 'USER' } });
    if (defaultRole) {
      user.roles = [defaultRole];
    }

    const savedUser = await this.userRepository.save(user);

    // Log registration attempt
    await this.logLoginAttempt({
      userId: savedUser.id,
      emailOrWallet: registerDto.email || registerDto.walletAddress,
      method: registerDto.walletAddress ? LoginMethod.WALLET_SIGNATURE : LoginMethod.EMAIL_PASSWORD,
      result: LoginAttemptResult.SUCCESS,
      ipAddress,
      userAgent,
      walletAddress: registerDto.walletAddress,
    });

    // Generate tokens if user is active
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

    // Determine login method and find user
    if (loginDto.walletAddress && loginDto.signature) {
      user = await this.validateWalletLogin(loginDto);
      loginMethod = LoginMethod.WALLET_SIGNATURE;
    } else if (loginDto.email && loginDto.password) {
      user = await this.validateEmailLogin(loginDto);
      loginMethod = LoginMethod.EMAIL_PASSWORD;
    } else {
      throw new BadRequestException('Invalid login credentials provided');
    }

    // Check if account is locked
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

    // Check if account is active
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

    // Check if 2FA is required
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

    // Update user login info
    user.updateLastLogin();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent, loginDto.deviceId, loginDto.deviceName);

    // Log successful login
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

    // Revoke old token
    refreshToken.revoke('Replaced by new token', user.id, ipAddress);
    await this.refreshTokenRepository.save(refreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent, refreshTokenDto.deviceId);

    // Log refresh token usage
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
      // Revoke all refresh tokens for user
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

  // Password Management

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = user.generatePasswordResetToken();
    await this.userRepository.save(user);

    // TODO: Send password reset email
    this.logger.log(`Password reset token generated for user ${user.id}: ${resetToken}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: resetPasswordDto.token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.resetPassword(resetPasswordDto.newPassword);
    await this.userRepository.save(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await user.validatePassword(changePasswordDto.currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await this.userRepository.save(user);
  }

  // Email Verification

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: verifyEmailDto.token,
        emailVerificationExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.verifyEmail();
    await this.userRepository.save(user);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return; // Don't reveal if email exists
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = user.generateEmailVerificationToken();
    await this.userRepository.save(user);

    // TODO: Send verification email
    this.logger.log(`Email verification token generated for user ${user.id}: ${token}`);
  }

  // Two-Factor Authentication

  async generate2FASecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: user.email || user.walletAddress,
      issuer: 'RwaLandChain',
    });

    user.twoFactorSecret = secret.base32;
    await this.userRepository.save(user);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  async enable2FA(userId: string, enable2FADto: Enable2FADto): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not found');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: enable2FADto.code,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    user.twoFactorEnabled = true;
    user.backupCodes = backupCodes;
    await this.userRepository.save(user);

    return backupCodes;
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await this.verify2FA(user, code);
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = null;
    await this.userRepository.save(user);
  }

  private async verify2FA(user: User, code: string): Promise<boolean> {
    if (!user.twoFactorSecret) {
      return false;
    }

    // Check TOTP code
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (isValidTOTP) {
      return true;
    }

    // Check backup codes
    if (user.backupCodes && user.backupCodes.includes(code.toUpperCase())) {
      // Remove used backup code
      user.backupCodes = user.backupCodes.filter(bc => bc !== code.toUpperCase());
      await this.userRepository.save(user);
      return true;
    }

    return false;
  }

  // User Management

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
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

    const user = this.userRepository.create(createUserDto);

    if (createUserDto.roles) {
      const roles = await this.roleRepository.findByIds(createUserDto.roles);
      user.roles = roles;
    }

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

  // Role Management

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

  // Login Attempts

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

  // Helper Methods

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
    const walletAddress = 'walletAddress' in loginDto ? loginDto.walletAddress : loginDto.walletAddress;
    const signature = 'signature' in loginDto ? loginDto.signature : loginDto.signature;
    const message = 'message' in loginDto ? loginDto.message : loginDto.message;

    if (!walletAddress || !signature || !message) {
      throw new BadRequestException('Wallet address, signature, and message are required');
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Find user by wallet address
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

    // Create refresh token record
    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
      expiresIn: 3600, // 1 hour
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

