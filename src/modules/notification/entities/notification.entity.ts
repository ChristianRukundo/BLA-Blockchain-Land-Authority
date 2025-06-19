import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType, NotificationStatus, NotificationChannel } from '../enums/notification.enum';
import { NotificationTemplate } from './notification-template.entity';

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['type', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  data: any;

  @Column({ name: 'template_id', nullable: true })
  template: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.WEB],
  })
  channels: NotificationChannel[];

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'failed_at', nullable: true })
  failedAt: Date;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage: string;

  @Column('jsonb', { name: 'metadata', nullable: true })
  metadata: any;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  archived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  notificationTemplate: NotificationTemplate;

  // Virtual properties
  get isRead(): boolean {
    return this.readAt !== null;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.status === NotificationStatus.FAILED;
  }
}

