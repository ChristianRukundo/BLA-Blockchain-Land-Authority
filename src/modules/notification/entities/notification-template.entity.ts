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

@Entity('notification_templates')
@Unique(['type'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('text', { name: 'email_subject', nullable: true })
  emailSubject: string;

  @Column('text', { name: 'email_content', nullable: true })
  emailContent: string;

  @Column('text', { name: 'sms_content', nullable: true })
  smsContent: string;

  @Column('text', { name: 'push_title', nullable: true })
  pushTitle: string;

  @Column('text', { name: 'push_content', nullable: true })
  pushContent: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.WEB],
  })
  channels: NotificationChannel[];

  @Column('jsonb', { name: 'default_data', nullable: true })
  defaultData: any;

  @Column('simple-array', { nullable: true })
  variables: string[];

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'auto_expire_hours', nullable: true })
  autoExpireHours: number;

  @Column({ name: 'priority_level', default: 1 })
  priorityLevel: number;

  @Column('jsonb', { name: 'styling', nullable: true })
  styling: any;

  @Column('jsonb', { name: 'conditions', nullable: true })
  conditions: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  formatContent(data: any): string {
    if (!this.content || !data) return this.content;

    return this.content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], data);
      return value !== undefined ? value : match;
    });
  }

  formatTitle(data: any): string {
    if (!this.title || !data) return this.title;

    return this.title.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], data);
      return value !== undefined ? value : match;
    });
  }

  formatEmailSubject(data: any): string {
    if (!this.emailSubject || !data) return this.emailSubject;

    return this.emailSubject.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], data);
      return value !== undefined ? value : match;
    });
  }

  formatEmailContent(data: any): string {
    if (!this.emailContent || !data) return this.emailContent;

    return this.emailContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], data);
      return value !== undefined ? value : match;
    });
  }
}

