import { DataSource } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { LandParcel } from '../entities/land-parcel.entity';

export class NotificationSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const notificationRepository = dataSource.getRepository(Notification);
    const userRepository = dataSource.getRepository(User);
    const landParcelRepository = dataSource.getRepository(LandParcel);

    // Check if notifications already exist
    const existingNotifications = await notificationRepository.count();
    if (existingNotifications > 0) {
      console.log('🔔 Notifications already exist, skipping notification seeding');
      return;
    }

    console.log('🔔 Seeding notifications...');

    // Get users and land parcels
    const users = await userRepository.find({ where: { isActive: true } });
    const landParcels = await landParcelRepository.find({ take: 10 });

    if (users.length === 0) {
      console.log('❌ No users found, cannot seed notifications');
      return;
    }

    // Sample notification templates
    const notificationTemplates = [
      // System notifications
      {
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.MEDIUM,
        title: 'Welcome to RwaLandChain',
        message: 'Your account has been successfully created. Complete your profile to get started.',
        icon: 'welcome',
        actionText: 'Complete Profile',
        actionUrl: '/profile',
      },
      {
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.LOW,
        title: 'System Maintenance Scheduled',
        message: 'Scheduled maintenance will occur on Sunday from 2:00 AM to 4:00 AM EAT.',
        icon: 'maintenance',
      },
      {
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        title: 'New Feature Available',
        message: 'Advanced search filters are now available for land parcel discovery.',
        icon: 'feature',
        actionText: 'Explore',
        actionUrl: '/parcels',
      },

      // Transaction notifications
      {
        type: NotificationType.TRANSACTION,
        priority: NotificationPriority.HIGH,
        title: 'Land Transfer Completed',
        message: 'Your land parcel transfer has been successfully completed and recorded on the blockchain.',
        icon: 'transfer',
        actionText: 'View Transaction',
      },
      {
        type: NotificationType.TRANSACTION,
        priority: NotificationPriority.MEDIUM,
        title: 'Transaction Pending',
        message: 'Your transaction is being processed. This may take a few minutes.',
        icon: 'pending',
      },
      {
        type: NotificationType.TRANSACTION,
        priority: NotificationPriority.URGENT,
        title: 'Transaction Failed',
        message: 'Your recent transaction failed due to insufficient gas. Please try again.',
        icon: 'error',
        actionText: 'Retry',
      },

      // Compliance notifications
      {
        type: NotificationType.COMPLIANCE,
        priority: NotificationPriority.HIGH,
        title: 'Compliance Inspection Due',
        message: 'Your land parcel is due for compliance inspection within the next 30 days.',
        icon: 'inspection',
        actionText: 'Schedule Inspection',
      },
      {
        type: NotificationType.COMPLIANCE,
        priority: NotificationPriority.URGENT,
        title: 'Compliance Violation Detected',
        message: 'A compliance violation has been detected on your property. Immediate action required.',
        icon: 'violation',
        actionText: 'View Details',
      },
      {
        type: NotificationType.COMPLIANCE,
        priority: NotificationPriority.MEDIUM,
        title: 'Compliance Score Updated',
        message: 'Your land parcel compliance score has been updated to 92/100.',
        icon: 'score',
      },
      {
        type: NotificationType.COMPLIANCE,
        priority: NotificationPriority.LOW,
        title: 'EcoCredits Awarded',
        message: 'You have been awarded 50 EcoCredits for maintaining excellent environmental standards.',
        icon: 'eco',
      },

      // Inheritance notifications
      {
        type: NotificationType.INHERITANCE,
        priority: NotificationPriority.HIGH,
        title: 'Heir Designation Updated',
        message: 'You have successfully updated the heir designation for your land parcel.',
        icon: 'heir',
      },
      {
        type: NotificationType.INHERITANCE,
        priority: NotificationPriority.URGENT,
        title: 'Inheritance Process Initiated',
        message: 'An inheritance process has been initiated for land parcel LP-2024-0001.',
        icon: 'inheritance',
        actionText: 'Review',
      },

      // Dispute notifications
      {
        type: NotificationType.DISPUTE,
        priority: NotificationPriority.HIGH,
        title: 'New Dispute Filed',
        message: 'A dispute has been filed regarding your land parcel. Please review the details.',
        icon: 'dispute',
        actionText: 'View Dispute',
      },
      {
        type: NotificationType.DISPUTE,
        priority: NotificationPriority.MEDIUM,
        title: 'Dispute Resolution Update',
        message: 'The arbitrator has made a decision on your land dispute case.',
        icon: 'resolution',
        actionText: 'View Decision',
      },

      // Governance notifications
      {
        type: NotificationType.GOVERNANCE,
        priority: NotificationPriority.MEDIUM,
        title: 'New Governance Proposal',
        message: 'A new proposal has been submitted for community voting. Your participation is important.',
        icon: 'proposal',
        actionText: 'Vote Now',
        actionUrl: '/governance',
      },
      {
        type: NotificationType.GOVERNANCE,
        priority: NotificationPriority.LOW,
        title: 'Voting Period Ending',
        message: 'The voting period for Proposal #15 ends in 24 hours. Make sure to cast your vote.',
        icon: 'voting',
        actionText: 'Vote',
      },

      // Expropriation notifications
      {
        type: NotificationType.EXPROPRIATION,
        priority: NotificationPriority.URGENT,
        title: 'Expropriation Notice',
        message: 'Your land has been flagged for potential expropriation for public infrastructure development.',
        icon: 'expropriation',
        actionText: 'View Details',
      },
      {
        type: NotificationType.EXPROPRIATION,
        priority: NotificationPriority.HIGH,
        title: 'Compensation Available',
        message: 'Compensation for your expropriated land is now available for claim.',
        icon: 'compensation',
        actionText: 'Claim Compensation',
      },

      // Security notifications
      {
        type: NotificationType.SECURITY,
        priority: NotificationPriority.HIGH,
        title: 'New Login Detected',
        message: 'A new login to your account was detected from a different device.',
        icon: 'security',
      },
      {
        type: NotificationType.SECURITY,
        priority: NotificationPriority.URGENT,
        title: 'Suspicious Activity',
        message: 'Suspicious activity detected on your account. Please review your recent transactions.',
        icon: 'warning',
        actionText: 'Review Activity',
      },
    ];

    // Create notifications for users
    for (const user of users) {
      // Create 3-8 random notifications per user
      const notificationCount = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < notificationCount; i++) {
        const template = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)];
        
        // Create notification
        const notification = notificationRepository.create({
          userId: user.id,
          type: template.type,
          priority: template.priority,
          title: template.title,
          message: template.message,
          icon: template.icon,
          actionText: template.actionText,
          actionUrl: template.actionUrl,
          data: {},
        });

        // Add specific data based on notification type
        if (template.type === NotificationType.TRANSACTION) {
          notification.data = {
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: Math.floor(Math.random() * 100000) + 21000,
          };
        } else if (template.type === NotificationType.COMPLIANCE && landParcels.length > 0) {
          const randomParcel = landParcels[Math.floor(Math.random() * landParcels.length)];
          notification.relatedEntityType = 'land_parcel';
          notification.relatedEntityId = randomParcel.id;
          notification.data = {
            parcelId: randomParcel.parcelId,
            complianceScore: Math.floor(Math.random() * 100),
            inspectionDate: new Date().toISOString(),
          };
        } else if (template.type === NotificationType.GOVERNANCE) {
          notification.data = {
            proposalId: `PROP-${Math.floor(Math.random() * 100) + 1}`,
            proposalTitle: 'Update Land Use Compliance Rules',
            votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
        }

        // Randomly set some notifications as read
        if (Math.random() > 0.4) { // 60% chance of being read
          notification.status = 'read';
          notification.readAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Read within last week
        }

        // Randomly set some notifications as archived
        if (Math.random() > 0.9) { // 10% chance of being archived
          notification.status = 'archived';
          notification.archivedAt = new Date();
        }

        // Set creation date to within last 30 days
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        notification.createdAt = createdAt;

        // Randomly set expiration for some notifications
        if (Math.random() > 0.8) { // 20% chance of having expiration
          notification.expiresAt = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        }

        // Randomly mark some as email sent
        if (Math.random() > 0.3) { // 70% chance
          notification.emailSent = true;
          notification.emailSentAt = new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000); // Within 1 hour of creation
        }

        await notificationRepository.save(notification);
      }
    }

    console.log(`✅ Created ${await notificationRepository.count()} notifications`);

    // Create some system-wide notifications for all users
    const systemNotifications = [
      {
        title: 'Platform Update v2.0',
        message: 'RwaLandChain has been updated with new features including advanced analytics and improved security.',
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.MEDIUM,
      },
      {
        title: 'Scheduled Maintenance Complete',
        message: 'The scheduled maintenance has been completed successfully. All systems are now operational.',
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.LOW,
      },
    ];

    for (const sysNotif of systemNotifications) {
      for (const user of users.slice(0, 10)) { // Send to first 10 users
        const notification = notificationRepository.create({
          userId: user.id,
          type: sysNotif.type,
          priority: sysNotif.priority,
          title: sysNotif.title,
          message: sysNotif.message,
          icon: 'system',
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        });

        await notificationRepository.save(notification);
      }
    }

    console.log(`✅ Notification seeding completed. Total notifications: ${await notificationRepository.count()}`);
  }
}

