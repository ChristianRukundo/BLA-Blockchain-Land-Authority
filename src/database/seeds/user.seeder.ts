import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';

export class UserSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const profileRepository = dataSource.getRepository(UserProfile);

    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('👥 Users already exist, skipping user seeding');
      return;
    }

    console.log('👥 Seeding users...');

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const adminUser = userRepository.create({
      email: 'admin@rwalandchain.com',
      walletAddress: '0x1234567890123456789012345678901234567890',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      isActive: true,
    });
    await userRepository.save(adminUser);

    // Create admin profile
    const adminProfile = profileRepository.create({
      userId: adminUser.id,
      firstName: 'System',
      lastName: 'Administrator',
      phoneNumber: '+250 788 000 001',
      address: 'Kigali, Rwanda',
      district: 'Gasabo',
      sector: 'Kimisagara',
      cell: 'Nyabugogo',
      village: 'Nyabugogo',
      country: 'Rwanda',
      isPublic: false,
      isVerified: true,
    });
    await profileRepository.save(adminProfile);

    // Create RLMUA officer
    const rlmuaUser = userRepository.create({
      email: 'officer@rlmua.gov.rw',
      walletAddress: '0x2345678901234567890123456789012345678901',
      password: hashedPassword,
      role: UserRole.RLMUA_OFFICER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      isActive: true,
    });
    await userRepository.save(rlmuaUser);

    // Create RLMUA officer profile
    const rlmuaProfile = profileRepository.create({
      userId: rlmuaUser.id,
      firstName: 'Jean',
      lastName: 'Uwimana',
      phoneNumber: '+250 788 000 002',
      occupation: 'Land Administration Officer',
      address: 'Kigali, Rwanda',
      district: 'Nyarugenge',
      sector: 'Nyarugenge',
      cell: 'Rwampara',
      village: 'Rwampara',
      country: 'Rwanda',
      isPublic: true,
      isVerified: true,
    });
    await profileRepository.save(rlmuaProfile);

    // Create regular users
    const regularUsers = [
      {
        email: 'marie.mukamana@email.com',
        walletAddress: '0x3456789012345678901234567890123456789012',
        firstName: 'Marie',
        lastName: 'Mukamana',
        phoneNumber: '+250 788 123 456',
        district: 'Kicukiro',
        sector: 'Niboye',
        cell: 'Kabuga',
        village: 'Kabuga',
      },
      {
        email: 'paul.kagame@email.com',
        walletAddress: '0x4567890123456789012345678901234567890123',
        firstName: 'Paul',
        lastName: 'Kagame',
        phoneNumber: '+250 788 234 567',
        district: 'Gasabo',
        sector: 'Kacyiru',
        cell: 'Kamatamu',
        village: 'Kamatamu',
      },
      {
        email: 'grace.uwimana@email.com',
        walletAddress: '0x5678901234567890123456789012345678901234',
        firstName: 'Grace',
        lastName: 'Uwimana',
        phoneNumber: '+250 788 345 678',
        district: 'Nyarugenge',
        sector: 'Gitega',
        cell: 'Gitega',
        village: 'Gitega',
      },
      {
        email: 'jean.baptiste@email.com',
        walletAddress: '0x6789012345678901234567890123456789012345',
        firstName: 'Jean Baptiste',
        lastName: 'Nzeyimana',
        phoneNumber: '+250 788 456 789',
        district: 'Rwamagana',
        sector: 'Kigabiro',
        cell: 'Kigabiro',
        village: 'Kigabiro',
      },
      {
        email: 'alice.mutesi@email.com',
        walletAddress: '0x7890123456789012345678901234567890123456',
        firstName: 'Alice',
        lastName: 'Mutesi',
        phoneNumber: '+250 788 567 890',
        district: 'Huye',
        sector: 'Tumba',
        cell: 'Tumba',
        village: 'Tumba',
      },
    ];

    for (const userData of regularUsers) {
      // Create user
      const user = userRepository.create({
        email: userData.email,
        walletAddress: userData.walletAddress,
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isActive: true,
      });
      await userRepository.save(user);

      // Create user profile
      const profile = profileRepository.create({
        userId: user.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        address: `${userData.cell}, ${userData.sector}, ${userData.district}`,
        district: userData.district,
        sector: userData.sector,
        cell: userData.cell,
        village: userData.village,
        country: 'Rwanda',
        isPublic: true,
        isVerified: Math.random() > 0.3, // 70% verified
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          privacy: {
            showProfile: true,
            showLandParcels: true,
            showTransactions: false,
          },
        },
      });
      await profileRepository.save(profile);
    }

    // Create some unverified users
    const unverifiedUsers = [
      {
        email: 'pending1@email.com',
        walletAddress: '0x8901234567890123456789012345678901234567',
        firstName: 'Pending',
        lastName: 'User1',
      },
      {
        email: 'pending2@email.com',
        walletAddress: '0x9012345678901234567890123456789012345678',
        firstName: 'Pending',
        lastName: 'User2',
      },
    ];

    for (const userData of unverifiedUsers) {
      const user = userRepository.create({
        email: userData.email,
        walletAddress: userData.walletAddress,
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        isActive: true,
      });
      await userRepository.save(user);

      const profile = profileRepository.create({
        userId: user.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        country: 'Rwanda',
        isPublic: false,
        isVerified: false,
      });
      await profileRepository.save(profile);
    }

    console.log(`✅ Created ${await userRepository.count()} users with profiles`);
  }
}

