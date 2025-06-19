import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserProfileService } from './user-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { ProfileStatus, KYCStatus } from './entities/user-profile.entity';
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  UpdateKYCDto,
  UpdateProfileStatusDto,
  UpdateNotificationPreferencesDto,
  UpdatePrivacySettingsDto,
  UserProfileResponseDto,
  UserProfileListResponseDto,
  UserProfileStatisticsDto,
} from './dto/user-profile.dto';

@ApiTags('user-profile')
@Controller('user-profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({ status: 201, description: 'User profile created successfully', type: UserProfileResponseDto })
  async create(@Body() createUserProfileDto: CreateUserProfileDto) {
    try {
      return await this.userProfileService.create(createUserProfileDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create user profile: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all user profiles with filtering' })
  @ApiResponse({ status: 200, description: 'User profiles retrieved successfully', type: UserProfileListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ProfileStatus })
  @ApiQuery({ name: 'kycStatus', required: false, enum: KYCStatus })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ProfileStatus,
    @Query('kycStatus') kycStatus?: KYCStatus,
  ) {
    try {
      return await this.userProfileService.findAll(page, limit, status, kycStatus);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user profiles: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserProfileResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.findOne(id);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('wallet/:walletAddress')
  @ApiOperation({ summary: 'Get a user profile by wallet address' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserProfileResponseDto })
  async findByWalletAddress(@Param('walletAddress') walletAddress: string) {
    try {
      const profile = await this.userProfileService.findByWalletAddress(walletAddress);
      if (!profile) {
        throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
      }
      return profile;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('email/:email')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user profile by email' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserProfileResponseDto })
  async findByEmail(@Param('email') email: string) {
    try {
      const profile = await this.userProfileService.findByEmail(email);
      if (!profile) {
        throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
      }
      return profile;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('national-id/:nationalId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user profile by national ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserProfileResponseDto })
  async findByNationalId(@Param('nationalId') nationalId: string) {
    try {
      const profile = await this.userProfileService.findByNationalId(nationalId);
      if (!profile) {
        throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
      }
      return profile;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully', type: UserProfileResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    try {
      return await this.userProfileService.update(id, updateUserProfileDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/kyc')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status updated successfully', type: UserProfileResponseDto })
  async updateKYC(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateKYCDto: UpdateKYCDto,
  ) {
    try {
      return await this.userProfileService.updateKYC(id, updateKYCDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update KYC status: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update profile status' })
  @ApiResponse({ status: 200, description: 'Profile status updated successfully', type: UserProfileResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileStatusDto: UpdateProfileStatusDto,
  ) {
    try {
      return await this.userProfileService.updateStatus(id, updateProfileStatusDto.status);
    } catch (error) {
      throw new HttpException(
        `Failed to update profile status: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated successfully', type: UserProfileResponseDto })
  async updateNotificationPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    try {
      const profile = await this.userProfileService.findOne(id);
      profile.notificationPreferences = updateNotificationPreferencesDto;
      return await this.userProfileService.update(id, profile);
    } catch (error) {
      throw new HttpException(
        `Failed to update notification preferences: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/privacy-settings')
  @ApiOperation({ summary: 'Update privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated successfully', type: UserProfileResponseDto })
  async updatePrivacySettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrivacySettingsDto: UpdatePrivacySettingsDto,
  ) {
    try {
      const profile = await this.userProfileService.findOne(id);
      profile.privacySettings = updatePrivacySettingsDto;
      return await this.userProfileService.update(id, profile);
    } catch (error) {
      throw new HttpException(
        `Failed to update privacy settings: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/verify-email')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully', type: UserProfileResponseDto })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.verifyEmail(id);
    } catch (error) {
      throw new HttpException(
        `Failed to verify email: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/verify-phone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify phone number' })
  @ApiResponse({ status: 200, description: 'Phone number verified successfully', type: UserProfileResponseDto })
  async verifyPhone(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.verifyPhone(id);
    } catch (error) {
      throw new HttpException(
        `Failed to verify phone: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/enable-2fa')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully', type: UserProfileResponseDto })
  async enableTwoFactor(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.enableTwoFactor(id);
    } catch (error) {
      throw new HttpException(
        `Failed to enable 2FA: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/disable-2fa')
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully', type: UserProfileResponseDto })
  async disableTwoFactor(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.disableTwoFactor(id);
    } catch (error) {
      throw new HttpException(
        `Failed to disable 2FA: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/accept-terms')
  @ApiOperation({ summary: 'Accept terms and conditions' })
  @ApiResponse({ status: 200, description: 'Terms accepted successfully', type: UserProfileResponseDto })
  async acceptTerms(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.acceptTerms(id);
    } catch (error) {
      throw new HttpException(
        `Failed to accept terms: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/accept-privacy-policy')
  @ApiOperation({ summary: 'Accept privacy policy' })
  @ApiResponse({ status: 200, description: 'Privacy policy accepted successfully', type: UserProfileResponseDto })
  async acceptPrivacyPolicy(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.userProfileService.acceptPrivacyPolicy(id);
    } catch (error) {
      throw new HttpException(
        `Failed to accept privacy policy: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user profile' })
  @ApiResponse({ status: 200, description: 'User profile deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.userProfileService.remove(id);
      return { message: 'User profile deleted successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to delete user profile: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user profile statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: UserProfileStatisticsDto })
  async getStatistics() {
    try {
      return await this.userProfileService.getStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
