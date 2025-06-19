import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { EmailService } from './email.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  BulkNotificationDto,
  NotificationPreferenceDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  NotificationStatsDto,
} from './dto/notification.dto';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
} from './enums/notification.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for user ${createNotificationDto.userId}`);

    const preferences = await this.getPreferences(createNotificationDto.userId);

    if (!preferences.isTypeEnabled(createNotificationDto.type)) {
      this.logger.log(
        `Notification type ${createNotificationDto.type} is disabled for user ${createNotificationDto.userId}`,
      );
      return null;
    }

    let template: NotificationTemplate = null;
    if (createNotificationDto.templateId) {
      template = await this.templateRepository.findOne({
        where: { id: createNotificationDto.templateId },
      });
    } else {
      template = await this.templateRepository.findOne({
        where: { type: createNotificationDto.type, active: true },
      });
    }

    let channels = createNotificationDto.channels;
    if (!channels) {
      if (template) {
        channels = template.channels;
      } else {
        channels = preferences.getEnabledChannelsForType(createNotificationDto.type);
      }
    }

    channels = channels.filter(channel => preferences.isChannelEnabled(channel));

    if (channels.length === 0) {
      this.logger.log(`No enabled channels for user ${createNotificationDto.userId}`);
      return null;
    }

    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      channels,
      template: template?.id,
      status: NotificationStatus.PENDING,
    });

    if (template) {
      notification.title = template.formatTitle(createNotificationDto.data);
      notification.content = template.formatContent(createNotificationDto.data);

      if (template.autoExpireHours) {
        notification.expiresAt = new Date(Date.now() + template.autoExpireHours * 60 * 60 * 1000);
      }
    }

    const savedNotification = await this.notificationRepository.save(notification);

    if (!preferences.isInQuietHours()) {
      await this.sendNotification(savedNotification, preferences, template);
    }

    return savedNotification;
  }

  async getUserNotifications(userId: string, query: NotificationQueryDto): Promise<any> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('notification.status = :status', { status: query.status });
    }

    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.unreadOnly) {
      queryBuilder.andWhere('notification.readAt IS NULL');
    }

    if (query.archived !== undefined) {
      queryBuilder.andWhere('notification.archived = :archived', { archived: query.archived });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(notification.title ILIKE :search OR notification.content ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.fromDate) {
      queryBuilder.andWhere('notification.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      queryBuilder.andWhere('notification.createdAt <= :toDate', { toDate: query.toDate });
    }

    const [notifications, total] = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: notifications,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getNotificationById(id: string, userId?: string): Promise<Notification> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const notification = await this.notificationRepository.findOne({ where });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async updateNotification(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.getNotificationById(id, userId);

    Object.assign(notification, updateNotificationDto);

    if (updateNotificationDto.isRead !== undefined) {
      if (updateNotificationDto.isRead) {
        notification.readAt = new Date();
      } else {
        notification.readAt = null;
      }
    }

    return this.notificationRepository.save(notification);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.getNotificationById(id, userId);

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, readAt: null },
      { readAt: new Date() },
    );

    return result.affected || 0;
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.getNotificationById(id, userId);
    await this.notificationRepository.remove(notification);
  }

  async deleteBulkNotifications(ids: string[], userId: string): Promise<number> {
    const result = await this.notificationRepository.delete({
      id: In(ids),
      userId,
    });

    return result.affected || 0;
  }

  async retryNotification(id: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['notificationTemplate'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.canRetry) {
      throw new BadRequestException('Notification cannot be retried');
    }

    const preferences = await this.getPreferences(notification.userId);
    const success = await this.sendNotification(
      notification,
      preferences,
      notification.notificationTemplate,
    );

    if (success) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      notification.retryCount += 1;
    } else {
      notification.retryCount += 1;
      if (notification.retryCount >= notification.maxRetries) {
        notification.status = NotificationStatus.FAILED;
      }
    }

    await this.notificationRepository.save(notification);
    return success;
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({
        userId,
        emailEnabled: true,
        webEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
        digestFrequency: 'daily',
      });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferencesDto: NotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    let preferences = await this.getPreferences(userId);

    Object.assign(preferences, preferencesDto);
    return this.preferenceRepository.save(preferences);
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepository.find({
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async getTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createTemplate(createTemplateDto: CreateTemplateDto): Promise<NotificationTemplate> {
    const existingTemplate = await this.templateRepository.findOne({
      where: { type: createTemplateDto.type },
    });

    if (existingTemplate) {
      throw new BadRequestException('Template for this type already exists');
    }

    const template = this.templateRepository.create(createTemplateDto);
    return this.templateRepository.save(template);
  }

  async updateTemplate(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.getTemplate(id);
    Object.assign(template, updateTemplateDto);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    await this.templateRepository.remove(template);
  }

  async getStatistics(): Promise<NotificationStatsDto> {
    const totalSent = await this.notificationRepository.count({
      where: {
        status: In([
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
          NotificationStatus.READ,
        ]),
      },
    });

    const totalDelivered = await this.notificationRepository.count({
      where: { status: In([NotificationStatus.DELIVERED, NotificationStatus.READ]) },
    });

    const totalRead = await this.notificationRepository.count({
      where: { status: NotificationStatus.READ },
    });

    const totalFailed = await this.notificationRepository.count({
      where: { status: NotificationStatus.FAILED },
    });

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

    const typeStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(CASE WHEN notification.status IN (:...sentStatuses) THEN 1 END)', 'sent')
      .addSelect(
        'COUNT(CASE WHEN notification.status IN (:...deliveredStatuses) THEN 1 END)',
        'delivered',
      )
      .addSelect('COUNT(CASE WHEN notification.status = :readStatus THEN 1 END)', 'read')
      .addSelect('COUNT(CASE WHEN notification.status = :failedStatus THEN 1 END)', 'failed')
      .setParameters({
        sentStatuses: [
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
          NotificationStatus.READ,
        ],
        deliveredStatuses: [NotificationStatus.DELIVERED, NotificationStatus.READ],
        readStatus: NotificationStatus.READ,
        failedStatus: NotificationStatus.FAILED,
      })
      .groupBy('notification.type')
      .getRawMany();

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = {
        sent: parseInt(stat.sent),
        delivered: parseInt(stat.delivered),
        read: parseInt(stat.read),
        failed: parseInt(stat.failed),
      };
      return acc;
    }, {});

    const channelStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('unnest(notification.channels)', 'channel')
      .addSelect('COUNT(CASE WHEN notification.status IN (:...sentStatuses) THEN 1 END)', 'sent')
      .addSelect(
        'COUNT(CASE WHEN notification.status IN (:...deliveredStatuses) THEN 1 END)',
        'delivered',
      )
      .addSelect('COUNT(CASE WHEN notification.status = :failedStatus THEN 1 END)', 'failed')
      .setParameters({
        sentStatuses: [
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
          NotificationStatus.READ,
        ],
        deliveredStatuses: [NotificationStatus.DELIVERED, NotificationStatus.READ],
        failedStatus: NotificationStatus.FAILED,
      })
      .groupBy('channel')
      .getRawMany();

    const byChannel = channelStats.reduce((acc, stat) => {
      acc[stat.channel] = {
        sent: parseInt(stat.sent),
        delivered: parseInt(stat.delivered),
        failed: parseInt(stat.failed),
      };
      return acc;
    }, {});

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      byType,
      byChannel,
    };
  }

  private async sendNotification(
    notification: Notification,
    preferences: NotificationPreference,
    template?: NotificationTemplate,
  ): Promise<boolean> {
    let success = true;

    try {
      for (const channel of notification.channels) {
        if (!preferences.isChannelEnabled(channel)) {
          continue;
        }

        switch (channel) {
          case NotificationChannel.EMAIL:
            if (preferences.email) {
              const emailSuccess = await this.sendEmailNotification(
                notification,
                preferences.email,
                template,
              );
              if (!emailSuccess) success = false;
            }
            break;

          case NotificationChannel.WEB:
            break;

          case NotificationChannel.PUSH:
            if (preferences.pushToken) {
              const pushSuccess = await this.sendPushNotification(
                notification,
                preferences.pushToken,
                template,
              );
              if (!pushSuccess) success = false;
            }
            break;

          case NotificationChannel.SMS:
            if (preferences.phoneNumber) {
              const smsSuccess = await this.sendSMSNotification(
                notification,
                preferences.phoneNumber,
                template,
              );
              if (!smsSuccess) success = false;
            }
            break;
        }
      }

      if (success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.failedAt = new Date();
      }
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id}:`, error);
      notification.status = NotificationStatus.FAILED;
      notification.failedAt = new Date();
      notification.errorMessage = (error as Error).message;
      success = false;
    }

    await this.notificationRepository.save(notification);
    return success;
  }

  private async sendEmailNotification(
    notification: Notification,
    email: string,
    template?: NotificationTemplate,
  ): Promise<boolean> {
    try {
      const subject = template?.formatEmailSubject(notification.data) || notification.title;
      const content = template?.formatEmailContent(notification.data) || notification.content;

      return await this.emailService.sendNotificationEmail(
        email,
        subject,
        content,
        notification.data,
      );
    } catch (error) {
      this.logger.error(`Failed to send email notification:`, error);
      return false;
    }
  }

  private async sendPushNotification(
    notification: Notification,
    pushToken: string,
    template?: NotificationTemplate,
  ): Promise<boolean> {
    try {
      this.logger.log(`Push notification would be sent to token: ${pushToken}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification:`, error);
      return false;
    }
  }

  private async sendSMSNotification(
    notification: Notification,
    phoneNumber: string,
    template?: NotificationTemplate,
  ): Promise<boolean> {
    try {
      this.logger.log(`SMS notification would be sent to: ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS notification:`, error);
      return false;
    }
  }

  async sendWelcomeNotification(userId: string, userData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.WELCOME,
      title: 'Welcome to RwaLandChain!',
      content:
        'Your account has been successfully created. Welcome to the future of land administration.',
      data: userData,
    });
  }

  async sendParcelTransferNotification(
    userId: string,
    parcelId: string,
    fromAddress: string,
    toAddress: string,
    isReceiver: boolean,
  ): Promise<void> {
    const type = isReceiver
      ? NotificationType.PARCEL_TRANSFER_RECEIVED
      : NotificationType.PARCEL_TRANSFER_SENT;
    const title = isReceiver ? 'Land Parcel Received' : 'Land Parcel Transferred';
    const content = isReceiver
      ? `You have received land parcel #${parcelId} from ${fromAddress}`
      : `You have transferred land parcel #${parcelId} to ${toAddress}`;

    await this.createNotification({
      userId,
      type,
      title,
      content,
      data: { parcelId, fromAddress, toAddress },
    });
  }

  async sendComplianceViolationNotification(
    userId: string,
    parcelId: string,
    violationType: string,
    fineAmount?: number,
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.COMPLIANCE_VIOLATION,
      title: 'Compliance Violation Detected',
      content: `Your land parcel #${parcelId} has a compliance violation: ${violationType}${fineAmount ? `. Fine: ${fineAmount} RWF` : ''}`,
      data: { parcelId, violationType, fineAmount },
    });
  }

  async sendExpropriationNotification(
    userId: string,
    parcelId: string,
    authority: string,
    compensation: number,
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.EXPROPRIATION_FLAGGED,
      title: 'Expropriation Notice',
      content: `Your land parcel #${parcelId} has been flagged for expropriation by ${authority}. Proposed compensation: ${compensation} RWF.`,
      data: { parcelId, authority, compensation },
    });
  }

  async sendDisputeNotification(
    userId: string,
    disputeId: string,
    disputeType: string,
    isPlaintiff: boolean,
  ): Promise<void> {
    const type = isPlaintiff ? NotificationType.DISPUTE_CREATED : NotificationType.DISPUTE_RECEIVED;
    const title = isPlaintiff ? 'Dispute Created' : 'Dispute Filed Against You';
    const content = isPlaintiff
      ? `Your dispute #${disputeId} has been created and is under review.`
      : `A dispute #${disputeId} has been filed against you. Please review and respond.`;

    await this.createNotification({
      userId,
      type,
      title,
      content,
      data: { disputeId, disputeType, isPlaintiff },
    });
  }

  async sendGovernanceNotification(
    userId: string,
    proposalId: string,
    proposalTitle: string,
    notificationType: NotificationType,
  ): Promise<void> {
    let title: string;
    let content: string;

    switch (notificationType) {
      case NotificationType.PROPOSAL_CREATED:
        title = 'New Governance Proposal';
        content = `A new proposal "${proposalTitle}" has been created. Review and vote now.`;
        break;
      case NotificationType.PROPOSAL_VOTING_STARTED:
        title = 'Voting Started';
        content = `Voting has started for proposal "${proposalTitle}". Cast your vote now.`;
        break;
      case NotificationType.PROPOSAL_VOTING_ENDING:
        title = 'Voting Ending Soon';
        content = `Voting for proposal "${proposalTitle}" ends soon. Make sure to cast your vote.`;
        break;
      case NotificationType.PROPOSAL_EXECUTED:
        title = 'Proposal Executed';
        content = `Proposal "${proposalTitle}" has been executed successfully.`;
        break;
      default:
        title = 'Governance Update';
        content = `Update on proposal "${proposalTitle}".`;
    }

    await this.createNotification({
      userId,
      type: notificationType,
      title,
      content,
      data: { proposalId, proposalTitle },
    });
  }
}
