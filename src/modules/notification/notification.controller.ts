import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationService } from './notification.service';
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
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notification created successfully',
    type: Notification,
  })
  @Roles('ADMIN', 'SYSTEM')
  async createNotification(
    @Body(ValidationPipe) createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk notifications sent successfully',
  })
  @Roles('ADMIN', 'SYSTEM')
  async sendBulkNotifications(
    @Body(ValidationPipe) bulkNotificationDto: BulkNotificationDto,
  ): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      bulkNotificationDto.userIds.map(userId =>
        this.notificationService.createNotification({
          ...bulkNotificationDto,
          userId,
        }),
      ),
    );

    const sent = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return { sent, failed };
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
  })
  async getUserNotifications(
    @Request() req,
    @Query(ValidationPipe) query: NotificationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const userId = req.user.sub;
    const result = await this.notificationService.getUserNotifications(userId, {
      unreadOnly: true,
      page: 1,
      limit: 1,
    });
    return { count: result.meta.total };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: NotificationStatsDto,
  })
  @Roles('ADMIN')
  async getStatistics(): Promise<NotificationStatsDto> {
    return this.notificationService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retrieved successfully',
    type: Notification,
  })
  async getNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<Notification> {
    const userId = req.user.sub;
    return this.notificationService.getNotificationById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification updated successfully',
    type: Notification,
  })
  async updateNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateNotificationDto: UpdateNotificationDto,
    @Request() req,
  ): Promise<Notification> {
    const userId = req.user.sub;
    return this.notificationService.updateNotification(id, userId, updateNotificationDto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
    type: Notification,
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<Notification> {
    const userId = req.user.sub;
    return this.notificationService.markAsRead(id, userId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@Request() req): Promise<{ updated: number }> {
    const userId = req.user.sub;
    const updated = await this.notificationService.markAllAsRead(userId);
    return { updated };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<{ deleted: boolean }> {
    const userId = req.user.sub;
    await this.notificationService.deleteNotification(id, userId);
    return { deleted: true };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications deleted successfully',
  })
  async deleteBulkNotifications(
    @Body() body: { ids: string[] },
    @Request() req,
  ): Promise<{ deleted: number }> {
    const userId = req.user.sub;
    const deleted = await this.notificationService.deleteBulkNotifications(body.ids, userId);
    return { deleted };
  }

  // Preferences endpoints
  @Get('preferences/me')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences retrieved successfully',
    type: NotificationPreference,
  })
  async getPreferences(@Request() req): Promise<NotificationPreference> {
    const userId = req.user.sub;
    return this.notificationService.getPreferences(userId);
  }

  @Put('preferences/me')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences updated successfully',
    type: NotificationPreference,
  })
  async updatePreferences(
    @Body(ValidationPipe) preferences: NotificationPreferenceDto,
    @Request() req,
  ): Promise<NotificationPreference> {
    const userId = req.user.sub;
    return this.notificationService.updatePreferences(userId, preferences);
  }

  // Template management endpoints (Admin only)
  @Get('templates')
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
    type: [NotificationTemplate],
  })
  @Roles('ADMIN')
  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.notificationService.getTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get notification template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
    type: NotificationTemplate,
  })
  @Roles('ADMIN')
  async getTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationTemplate> {
    return this.notificationService.getTemplate(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
    type: NotificationTemplate,
  })
  @Roles('ADMIN')
  async createTemplate(
    @Body(ValidationPipe) createTemplateDto: CreateTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.notificationService.createTemplate(createTemplateDto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
    type: NotificationTemplate,
  })
  @Roles('ADMIN')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTemplateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.notificationService.updateTemplate(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deleted successfully',
  })
  @Roles('ADMIN')
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    await this.notificationService.deleteTemplate(id);
    return { deleted: true };
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification retry initiated',
  })
  @Roles('ADMIN')
  async retryNotification(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ retried: boolean }> {
    const retried = await this.notificationService.retryNotification(id);
    return { retried };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test notification sent',
  })
  @Roles('ADMIN')
  async sendTestNotification(
    @Body() body: { userId: string; type: string; title: string; content: string },
  ): Promise<Notification> {
    return this.notificationService.createNotification({
      userId: body.userId,
      type: body.type as any,
      title: body.title,
      content: body.content,
    });
  }
}

