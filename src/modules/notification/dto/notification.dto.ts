import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationFrequency,
} from '../enums/notification.enum';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification' })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Channels to send notification through',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Notification expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    description: 'Notification priority level',
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Notification status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Mark as read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Archive notification' })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Show only unread notifications' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only archived notifications' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({ description: 'Search in title and content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  toDate?: Date;
}

export class BulkNotificationDto {
  @ApiProperty({ description: 'Array of user IDs' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification' })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Channels to send notification through',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}

export class NotificationPreferenceDto {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Enable web notifications' })
  @IsOptional()
  @IsBoolean()
  webEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Push notification token' })
  @IsOptional()
  @IsString()
  pushToken?: string;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Phone number for SMS' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Muted notification types' })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  mutedTypes?: NotificationType[];

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:MM)' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:MM)' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'User timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    enum: NotificationFrequency,
    description: 'Digest frequency',
  })
  @IsOptional()
  @IsEnum(NotificationFrequency)
  digestFrequency?: NotificationFrequency;

  @ApiPropertyOptional({ description: 'Custom notification settings' })
  @IsOptional()
  @IsObject()
  customSettings?: any;
}

export class CreateTemplateDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Notification title template' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification content template' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Email subject template' })
  @IsOptional()
  @IsString()
  emailSubject?: string;

  @ApiPropertyOptional({ description: 'Email content template' })
  @IsOptional()
  @IsString()
  emailContent?: string;

  @ApiPropertyOptional({ description: 'SMS content template' })
  @IsOptional()
  @IsString()
  smsContent?: string;

  @ApiPropertyOptional({ description: 'Push notification title' })
  @IsOptional()
  @IsString()
  pushTitle?: string;

  @ApiPropertyOptional({ description: 'Push notification content' })
  @IsOptional()
  @IsString()
  pushContent?: string;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Supported channels',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Default data for template' })
  @IsOptional()
  @IsObject()
  defaultData?: any;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Auto expire hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  autoExpireHours?: number;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priorityLevel?: number;

  @ApiPropertyOptional({ description: 'Template styling' })
  @IsOptional()
  @IsObject()
  styling?: any;

  @ApiPropertyOptional({ description: 'Template conditions' })
  @IsOptional()
  @IsObject()
  conditions?: any;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class NotificationStatsDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalSent: number;

  @ApiProperty({ description: 'Total notifications delivered' })
  totalDelivered: number;

  @ApiProperty({ description: 'Total notifications read' })
  totalRead: number;

  @ApiProperty({ description: 'Total notifications failed' })
  totalFailed: number;

  @ApiProperty({ description: 'Delivery rate percentage' })
  deliveryRate: number;

  @ApiProperty({ description: 'Read rate percentage' })
  readRate: number;

  @ApiProperty({ description: 'Statistics by type' })
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;

  @ApiProperty({ description: 'Statistics by channel' })
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

