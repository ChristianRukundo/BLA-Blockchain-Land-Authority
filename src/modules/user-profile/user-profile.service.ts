import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { UserProfile, ProfileStatus, KYCStatus } from './entities/user-profile.entity';
import { CreateUserProfileDto, UpdateUserProfileDto, UpdateKYCDto } from './dto/user-profile.dto';

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async create(createUserProfileDto: CreateUserProfileDto): Promise<UserProfile> {
    try {
      // Check if user profile already exists
      const existingProfile = await this.findByWalletAddress(createUserProfileDto.walletAddress);
      if (existingProfile) {
        throw new ConflictException('User profile already exists for this wallet address');
      }

      // Check for email uniqueness if provided
      if (createUserProfileDto.email) {
        const existingEmail = await this.userProfileRepository.findOne({
          where: { email: createUserProfileDto.email },
        });
        if (existingEmail) {
          throw new ConflictException('Email address is already in use');
        }
      }

      // Check for national ID uniqueness if provided
      if (createUserProfileDto.nationalId) {
        const existingNationalId = await this.userProfileRepository.findOne({
          where: { nationalId: createUserProfileDto.nationalId },
        });
        if (existingNationalId) {
          throw new ConflictException('National ID is already in use');
        }
      }

      const userProfile = this.userProfileRepository.create({
        ...createUserProfileDto,
        status: ProfileStatus.ACTIVE,
        kycStatus: KYCStatus.NOT_STARTED,
        verificationLevel: 0,
        isEmailVerified: false,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        preferredLanguage: createUserProfileDto.preferredLanguage || 'en',
        landHoldingsCount: 0,
        totalLandArea: 0,
        governanceTokenBalance: '0',
        ecoCreditsBalance: '0',
        mockRwfBalance: '0',
        lastActivityAt: new Date(),
      });

      const savedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`User profile created for wallet: ${createUserProfileDto.walletAddress}`);
      
      return savedProfile;
    } catch (error) {
      this.logger.error('Failed to create user profile', error);
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ProfileStatus,
    kycStatus?: KYCStatus,
  ): Promise<{ profiles: UserProfile[]; total: number; page: number; limit: number }> {
    try {
      const where: FindOptionsWhere<UserProfile> = {};
      
      if (status) {
        where.status = status;
      }
      
      if (kycStatus) {
        where.kycStatus = kycStatus;
      }

      const [profiles, total] = await this.userProfileRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        profiles,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user profiles', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.userProfileRepository.findOne({
        where: { id },
      });

      if (!userProfile) {
        throw new NotFoundException(`User profile with ID ${id} not found`);
      }

      return userProfile;
    } catch (error) {
      this.logger.error(`Failed to find user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async findByWalletAddress(walletAddress: string): Promise<UserProfile | null> {
    try {
      return await this.userProfileRepository.findOne({
        where: { walletAddress: walletAddress.toLowerCase() },
      });
    } catch (error) {
      this.logger.error(`Failed to find user profile by wallet address: ${walletAddress}`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      return await this.userProfileRepository.findOne({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      this.logger.error(`Failed to find user profile by email: ${email}`, error);
      throw error;
    }
  }

  async findByNationalId(nationalId: string): Promise<UserProfile | null> {
    try {
      return await this.userProfileRepository.findOne({
        where: { nationalId },
      });
    } catch (error) {
      this.logger.error(`Failed to find user profile by national ID: ${nationalId}`, error);
      throw error;
    }
  }

  async update(id: string, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);

      // Check for email uniqueness if being updated
      if (updateUserProfileDto.email && updateUserProfileDto.email !== userProfile.email) {
        const existingEmail = await this.userProfileRepository.findOne({
          where: { email: updateUserProfileDto.email },
        });
        if (existingEmail && existingEmail.id !== id) {
          throw new ConflictException('Email address is already in use');
        }
      }

      // Check for national ID uniqueness if being updated
      if (updateUserProfileDto.nationalId && updateUserProfileDto.nationalId !== userProfile.nationalId) {
        const existingNationalId = await this.userProfileRepository.findOne({
          where: { nationalId: updateUserProfileDto.nationalId },
        });
        if (existingNationalId && existingNationalId.id !== id) {
          throw new ConflictException('National ID is already in use');
        }
      }

      // Update the profile
      Object.assign(userProfile, updateUserProfileDto);
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`User profile updated for ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async updateKYC(id: string, updateKYCDto: UpdateKYCDto): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);

      userProfile.kycStatus = updateKYCDto.kycStatus;
      userProfile.kycDocuments = updateKYCDto.kycDocuments;
      userProfile.verificationLevel = updateKYCDto.verificationLevel || userProfile.verificationLevel;

      if (updateKYCDto.kycStatus === KYCStatus.COMPLETED) {
        userProfile.kycCompletedAt = new Date();
      }

      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`KYC status updated for user profile ID: ${id} to ${updateKYCDto.kycStatus}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update KYC for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: ProfileStatus): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.status = status;
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`User profile status updated for ID: ${id} to ${status}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update status for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async updateLastLogin(walletAddress: string): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { walletAddress: walletAddress.toLowerCase() },
        { 
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        },
      );
      this.logger.debug(`Last login updated for wallet: ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Failed to update last login for wallet: ${walletAddress}`, error);
      throw error;
    }
  }

  async updateLastActivity(walletAddress: string): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { walletAddress: walletAddress.toLowerCase() },
        { lastActivityAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Failed to update last activity for wallet: ${walletAddress}`, error);
      throw error;
    }
  }

  async updateTokenBalances(
    walletAddress: string,
    balances: {
      governanceTokenBalance?: string;
      ecoCreditsBalance?: string;
      mockRwfBalance?: string;
    },
  ): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { walletAddress: walletAddress.toLowerCase() },
        {
          ...balances,
          lastActivityAt: new Date(),
        },
      );
      this.logger.debug(`Token balances updated for wallet: ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Failed to update token balances for wallet: ${walletAddress}`, error);
      throw error;
    }
  }

  async updateLandHoldings(
    walletAddress: string,
    landHoldingsCount: number,
    totalLandArea: number,
  ): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { walletAddress: walletAddress.toLowerCase() },
        {
          landHoldingsCount,
          totalLandArea,
          lastActivityAt: new Date(),
        },
      );
      this.logger.debug(`Land holdings updated for wallet: ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Failed to update land holdings for wallet: ${walletAddress}`, error);
      throw error;
    }
  }

  async verifyEmail(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.isEmailVerified = true;
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Email verified for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to verify email for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async verifyPhone(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.isPhoneVerified = true;
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Phone verified for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to verify phone for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async enableTwoFactor(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.twoFactorEnabled = true;
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Two-factor authentication enabled for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to enable 2FA for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async disableTwoFactor(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.twoFactorEnabled = false;
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Two-factor authentication disabled for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to disable 2FA for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async acceptTerms(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.termsAcceptedAt = new Date();
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Terms accepted for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to accept terms for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async acceptPrivacyPolicy(id: string): Promise<UserProfile> {
    try {
      const userProfile = await this.findOne(id);
      userProfile.privacyPolicyAcceptedAt = new Date();
      userProfile.lastActivityAt = new Date();

      const updatedProfile = await this.userProfileRepository.save(userProfile);
      this.logger.log(`Privacy policy accepted for user profile ID: ${id}`);
      
      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to accept privacy policy for user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const userProfile = await this.findOne(id);
      await this.userProfileRepository.remove(userProfile);
      this.logger.log(`User profile deleted for ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user profile with ID: ${id}`, error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    kycCompletedUsers: number;
    verifiedUsers: number;
    usersByStatus: Record<ProfileStatus, number>;
    usersByKycStatus: Record<KYCStatus, number>;
  }> {
    try {
      const totalUsers = await this.userProfileRepository.count();
      const activeUsers = await this.userProfileRepository.count({
        where: { status: ProfileStatus.ACTIVE },
      });
      const kycCompletedUsers = await this.userProfileRepository.count({
        where: { kycStatus: KYCStatus.COMPLETED },
      });
      const verifiedUsers = await this.userProfileRepository.count({
        where: { 
          kycStatus: KYCStatus.COMPLETED,
          isEmailVerified: true,
          verificationLevel: 2,
        },
      });

      // Get counts by status
      const usersByStatus = {} as Record<ProfileStatus, number>;
      for (const status of Object.values(ProfileStatus)) {
        usersByStatus[status] = await this.userProfileRepository.count({
          where: { status },
        });
      }

      // Get counts by KYC status
      const usersByKycStatus = {} as Record<KYCStatus, number>;
      for (const kycStatus of Object.values(KYCStatus)) {
        usersByKycStatus[kycStatus] = await this.userProfileRepository.count({
          where: { kycStatus },
        });
      }

      return {
        totalUsers,
        activeUsers,
        kycCompletedUsers,
        verifiedUsers,
        usersByStatus,
        usersByKycStatus,
      };
    } catch (error) {
      this.logger.error('Failed to get user profile statistics', error);
      throw error;
    }
  }
}
