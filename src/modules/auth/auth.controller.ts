import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import {
  RegisterDto,
  LoginDto,
  WalletLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
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
  AuthResponseDto,
} from './dto/auth.dto';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public Authentication Endpoints

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<any> {
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email/password or wallet signature' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<any> {
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('wallet-login')
  @ApiOperation({ summary: 'Login with wallet signature' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet login successful',
    type: AuthResponseDto,
  })
  async walletLogin(
    @Body(ValidationPipe) walletLoginDto: WalletLoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<any> {
    return this.authService.walletLogin(walletLoginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  async refreshToken(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<any> {
    return this.authService.refreshToken(refreshTokenDto, ipAddress, userAgent);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
  })
  @ApiBearerAuth()
  async logout(
    @Request() req,
    @Body() body?: { refreshToken?: string },
  ): Promise<{ message: string }> {
    await this.authService.logout(req.user.sub, body?.refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout from all devices successful',
  })
  @ApiBearerAuth()
  async logoutAll(@Request() req): Promise<{ message: string }> {
    await this.authService.logoutAllDevices(req.user.sub);
    return { message: 'Logout from all devices successful' };
  }

  // Password Management

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
  })
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
  })
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successful' };
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiBearerAuth()
  async changePassword(
    @Request() req,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(req.user.sub, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  // Email Verification

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  async verifyEmail(
    @Body(ValidationPipe) verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent',
  })
  async resendVerification(
    @Body(ValidationPipe) resendVerificationDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    await this.authService.resendVerification(resendVerificationDto.email);
    return { message: 'If the email exists, a verification link has been sent' };
  }

  // Two-Factor Authentication

  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA secret generated',
  })
  @ApiBearerAuth()
  async generate2FA(@Request() req): Promise<{ secret: string; qrCodeUrl: string }> {
    return this.authService.generate2FASecret(req.user.sub);
  }

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA enabled successfully',
  })
  @ApiBearerAuth()
  async enable2FA(
    @Request() req,
    @Body(ValidationPipe) enable2FADto: Enable2FADto,
  ): Promise<{ backupCodes: string[] }> {
    const backupCodes = await this.authService.enable2FA(req.user.sub, enable2FADto);
    return { backupCodes };
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA disabled successfully',
  })
  @ApiBearerAuth()
  async disable2FA(
    @Request() req,
    @Body(ValidationPipe) verify2FADto: Verify2FADto,
  ): Promise<{ message: string }> {
    await this.authService.disable2FA(req.user.sub, verify2FADto.code);
    return { message: '2FA disabled successfully' };
  }

  // Profile Management

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: User,
  })
  @ApiBearerAuth()
  async getProfile(@Request() req): Promise<User> {
    return this.authService.getProfile(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: User,
  })
  @ApiBearerAuth()
  async updateProfile(
    @Request() req,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.authService.updateProfile(req.user.sub, updateProfileDto);
  }

  // User Management (Admin only)

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async getUsers(@Query(ValidationPipe) query: UserQueryDto): Promise<any> {
    return this.authService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.authService.getProfile(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: User,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<User> {
    return this.authService.createUser(createUserDto);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: User,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.authService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }

  // Role Management (Admin only)

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
    type: [UserRole],
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async getRoles(): Promise<UserRole[]> {
    return this.authService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: UserRole,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async createRole(@Body(ValidationPipe) roleDto: RoleDto): Promise<UserRole> {
    return this.authService.createRole(roleDto);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: UserRole,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRoleDto: UpdateRoleDto,
  ): Promise<UserRole> {
    return this.authService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async deleteRole(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.authService.deleteRole(id);
    return { message: 'Role deleted successfully' };
  }

  @Post('users/assign-roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles assigned successfully',
    type: User,
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async assignRoles(@Body(ValidationPipe) assignRoleDto: AssignRoleDto): Promise<User> {
    return this.authService.assignRoles(assignRoleDto);
  }

  // Login Attempts (Admin only)

  @Get('login-attempts')
  @ApiOperation({ summary: 'Get login attempts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login attempts retrieved successfully',
  })
  @ApiBearerAuth()
  @Roles('ADMIN')
  async getLoginAttempts(@Query(ValidationPipe) query: LoginAttemptQueryDto): Promise<any> {
    return this.authService.getLoginAttempts(query);
  }

  @Get('login-attempts/me')
  @ApiOperation({ summary: 'Get my login attempts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login attempts retrieved successfully',
  })
  @ApiBearerAuth()
  async getMyLoginAttempts(
    @Request() req,
    @Query(ValidationPipe) query: LoginAttemptQueryDto,
  ): Promise<any> {
    return this.authService.getLoginAttempts({
      ...query,
      userId: req.user.sub,
    });
  }

  // Health Check

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

