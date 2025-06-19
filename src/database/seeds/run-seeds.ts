import { AppDataSource } from '../data-source';
import { UserSeeder } from './user.seeder';
import { LandParcelSeeder } from './land-parcel.seeder';
import { NotificationSeeder } from './notification.seeder';

async function runSeeds() {
  console.log('🌱 Starting database seeding...');

  try {
    // Initialize data source if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    // Run seeders in order
    const userSeeder = new UserSeeder();
    await userSeeder.run(AppDataSource);
    console.log('✅ User seeding completed');

    const landParcelSeeder = new LandParcelSeeder();
    await landParcelSeeder.run(AppDataSource);
    console.log('✅ Land parcel seeding completed');

    const notificationSeeder = new NotificationSeeder();
    await notificationSeeder.run(AppDataSource);
    console.log('✅ Notification seeding completed');

    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  runSeeds();
}

export default runSeeds;

