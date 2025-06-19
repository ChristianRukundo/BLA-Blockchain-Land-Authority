import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { NotificationType, NotificationChannel } from '../enums/notification.enum';

@Entity('notification_preferences')
@Unique(['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'web_enabled', default: true })
  webEnabled: boolean;

  @Column({ name: 'push_enabled', default: false })
  pushEnabled: boolean;

  @Column({ name: 'push_token', nullable: true })
  pushToken: string;

  @Column({ name: 'sms_enabled', default: false })
  smsEnabled: boolean;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column('jsonb', { name: 'type_preferences', nullable: true })
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    channels: NotificationChannel[];
    frequency?: 'immediate' | 'daily' | 'weekly';
  }>;

  @Column('simple-array', { name: 'muted_types', nullable: true })
  mutedTypes: NotificationType[];

  @Column({ name: 'quiet_hours_start', nullable: true })
  quietHoursStart: string; // Format: "HH:MM"

  @Column({ name: 'quiet_hours_end', nullable: true })
  quietHoursEnd: string; // Format: "HH:MM"

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: 'digest_frequency', default: 'daily' })
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';

  @Column({ name: 'last_digest_sent', nullable: true })
  lastDigestSent: Date;

  @Column('jsonb', { name: 'custom_settings', nullable: true })
  customSettings: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isChannelEnabled(channel: NotificationChannel): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailEnabled && !!this.email;
      case NotificationChannel.WEB:
        return this.webEnabled;
      case NotificationChannel.PUSH:
        return this.pushEnabled && !!this.pushToken;
      case NotificationChannel.SMS:
        return this.smsEnabled && !!this.phoneNumber;
      default:
        return false;
    }
  }

  isTypeEnabled(type: NotificationType): boolean {
    if (this.mutedTypes?.includes(type)) {
      return false;
    }

    if (this.typePreferences?.[type]) {
      return this.typePreferences[type].enabled;
    }

    return true; // Default to enabled
  }

  getEnabledChannelsForType(type: NotificationType): NotificationChannel[] {
    const typePrefs = this.typePreferences?.[type];
    if (typePrefs?.channels) {
      return typePrefs.channels.filter(channel => this.isChannelEnabled(channel));
    }

    // Default channels based on global preferences
    const channels: NotificationChannel[] = [];
    if (this.webEnabled) channels.push(NotificationChannel.WEB);
    if (this.emailEnabled && this.email) channels.push(NotificationChannel.EMAIL);
    if (this.pushEnabled && this.pushToken) channels.push(NotificationChannel.PUSH);
    if (this.smsEnabled && this.phoneNumber) channels.push(NotificationChannel.SMS);

    return channels;
  }

  isInQuietHours(): boolean {
    if (!this.quietHoursStart || !this.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Handle same day quiet hours
    if (this.quietHoursStart <= this.quietHoursEnd) {
      return currentTime >= this.quietHoursStart && currentTime <= this.quietHoursEnd;
    }

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    return currentTime >= this.quietHoursStart || currentTime <= this.quietHoursEnd;
  }

  shouldSendDigest(): boolean {
    if (this.digestFrequency === 'never' || this.digestFrequency === 'immediate') {
      return false;
    }

    if (!this.lastDigestSent) {
      return true;
    }

    const now = new Date();
    const lastSent = new Date(this.lastDigestSent);
    const diffHours = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    switch (this.digestFrequency) {
      case 'hourly':
        return diffHours >= 1;
      case 'daily':
        return diffHours >= 24;
      case 'weekly':
        return diffHours >= 168; // 24 * 7
      default:
        return false;
    }
  }
}

