import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AdminAction, AdminActionType, AdminActionStatus } from './entities/admin-action.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { NotificationType } from '../notification/enums/notification.enum';
import {
  CreateAdminActionDto,
  UpdateAdminActionDto,
  ApproveActionDto,
  RejectActionDto,
  ExecuteActionDto,
  AdminActionResponseDto,
  AdminActionListResponseDto,
  AdminActionStatisticsDto,
  AdminActionFilterDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async createAdminAction(
    createAdminActionDto: CreateAdminActionDto,
    initiatorAddress: string,
  ): Promise<AdminAction> {
    try {
      const ipfsHash = await this.ipfsService.uploadJson({
        actionType: createAdminActionDto.actionType,
        actionData: createAdminActionDto.actionData,
        reason: createAdminActionDto.reason,
        createdAt: new Date().toISOString(),
      });

      const adminAction = this.adminActionRepository.create({
        ...createAdminActionDto,
        initiatorAddress,
        dataHash: ipfsHash,
        status: AdminActionStatus.PENDING,
        approvals: [],
        rejections: [],
        createdDate: new Date(),
        requiredApprovals: createAdminActionDto.requiredApprovals || 1,
      });

      const savedAction = await this.adminActionRepository.save(adminAction);
      this.logger.log(`Admin action created with ID: ${savedAction.id}`);

      await this.notifyApprovers(savedAction);

      await this.notificationService.createNotification({
        userId: initiatorAddress,
        type: NotificationType.ADMIN_ACTION_CREATED,
        title: 'Admin Action Created',
        content: `Your admin action "${savedAction.actionType}" has been created and is pending approval`,
        data: { actionId: savedAction.id },
      });

      return savedAction;
    } catch (error) {
      this.logger.error('Failed to create admin action', error);
      throw error;
    }
  }

  async findAll(filters: AdminActionFilterDto): Promise<AdminActionListResponseDto> {
    try {
      const where: FindOptionsWhere<AdminAction> = {};

      if (filters.actionType) where.actionType = filters.actionType;
      if (filters.status) where.status = filters.status;
      if (filters.initiatorAddress) where.initiatorAddress = filters.initiatorAddress;
      if (filters.targetContract) where.targetContract = filters.targetContract;

      if (filters.pendingOnly) {
        where.status = AdminActionStatus.PENDING;
      }

      if (filters.readyForExecution) {
        where.status = AdminActionStatus.APPROVED;
      }

      const [actions, total] = await this.adminActionRepository.findAndCount({
        where,
        order: { [filters.sortBy || 'createdDate']: filters.sortOrder || 'DESC' },
        skip: ((filters.page || 1) - 1) * (filters.limit || 10),
        take: filters.limit || 10,
      });

      return {
        actions: actions.map(action => this.mapToResponseDto(action)),
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
      };
    } catch (error) {
      this.logger.error('Failed to fetch admin actions', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<AdminAction> {
    try {
      const action = await this.adminActionRepository.findOne({ where: { id } });
      if (!action) {
        throw new NotFoundException(`Admin action with ID ${id} not found`);
      }
      return action;
    } catch (error) {
      this.logger.error(`Failed to find admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async update(id: string, updateAdminActionDto: UpdateAdminActionDto): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== AdminActionStatus.PENDING) {
        throw new BadRequestException('Cannot update action that is not pending');
      }

      Object.assign(action, updateAdminActionDto);
      const updatedAction = await this.adminActionRepository.save(action);

      this.logger.log(`Admin action updated with ID: ${id}`);
      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to update admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async approveAction(
    id: string,
    approveActionDto: ApproveActionDto,
    approverAddress: string,
  ): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== AdminActionStatus.PENDING) {
        throw new BadRequestException('Action is not pending approval');
      }

      if (action.approvals.includes(approverAddress)) {
        throw new BadRequestException('User has already approved this action');
      }

      action.approvals.push(approverAddress);
      action.approvalComments = action.approvalComments || {};
      action.approvalComments[approverAddress] = approveActionDto.comment;

      if (action.approvals.length >= action.requiredApprovals) {
        action.status = AdminActionStatus.APPROVED;
        action.approvedDate = new Date();
      }

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action approved by ${approverAddress}: ${id}`);

      await this.notificationService.createNotification({
        userId: action.initiatorAddress,
        type: NotificationType.ADMIN_ACTION_APPROVED,
        title: 'Admin Action Approved',
        content: `Your admin action "${action.actionType}" has been approved by ${approverAddress}`,
        data: { actionId: id, approvedBy: approverAddress },
      });

      try {
        const user = await this.userRepository.findOne({
          where: { walletAddress: action.initiatorAddress },
        });
        if (user && user.email) {
          await this.emailService.sendAdminActionNotification(
            user.email,
            user.firstName || 'User',
            action.actionType,
            'APPROVED',
            {
              actionId: id,
              title: action.title,
              description: action.description,
              approvedBy: approverAddress,
              timestamp: new Date().toISOString(),
              actionUrl: `${this.configService.get('app.url')}/admin/actions/${id}`,
            },
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send email notification for action approval: ${id}`, error);
      }

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to approve admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async rejectAction(id: string, reason: string, rejectorAddress: string): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== AdminActionStatus.PENDING) {
        throw new BadRequestException('Action is not pending approval');
      }

      if (action.rejections.includes(rejectorAddress)) {
        throw new BadRequestException('User has already rejected this action');
      }

      action.rejections.push(rejectorAddress);
      action.rejectionComments = action.rejectionComments || {};
      action.rejectionComments[rejectorAddress] = reason;

      action.status = AdminActionStatus.REJECTED;
      action.rejectedDate = new Date();

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action rejected by ${rejectorAddress}: ${id}`);

      await this.notificationService.createNotification({
        userId: action.initiatorAddress,
        type: NotificationType.ADMIN_ACTION_REJECTED,
        title: 'Admin Action Rejected',
        content: `Your admin action "${action.actionType}" has been rejected by ${rejectorAddress}`,
        data: { actionId: id, rejectedBy: rejectorAddress, reason },
      });

      try {
        const user = await this.userRepository.findOne({
          where: { walletAddress: action.initiatorAddress },
        });
        if (user && user.email) {
          await this.emailService.sendAdminActionNotification(
            user.email,
            user.firstName || 'User',
            action.actionType,
            'REJECTED',
            {
              actionId: id,
              title: action.title,
              description: action.description,
              rejectedBy: rejectorAddress,
              reason: reason,
              timestamp: new Date().toISOString(),
              actionUrl: `${this.configService.get('app.url')}/admin/actions/${id}`,
            },
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send email notification for action rejection: ${id}`, error);
      }

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to reject admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async executeAction(
    id: string,
    executeActionDto: ExecuteActionDto,
    executorAddress: string,
  ): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== AdminActionStatus.APPROVED) {
        throw new BadRequestException('Action must be approved before execution');
      }

      await this.executeActionLogic(action, executeActionDto);

      action.status = AdminActionStatus.EXECUTED;
      action.executedDate = new Date();
      action.executorAddress = executorAddress;
      action.executionTransactionHash = executeActionDto.transactionHash;
      action.executionNotes = executeActionDto.notes;

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action executed by ${executorAddress}: ${id}`);

      await this.notificationService.createNotification({
        userId: action.initiatorAddress,
        type: NotificationType.ADMIN_ACTION_EXECUTED,
        title: 'Admin Action Executed',
        content: `Your admin action "${action.actionType}" has been executed successfully`,
        data: {
          actionId: id,
          executedBy: executorAddress,
          transactionHash: executeActionDto.transactionHash,
        },
      });

      try {
        const user = await this.userRepository.findOne({
          where: { walletAddress: action.initiatorAddress },
        });
        if (user && user.email) {
          await this.emailService.sendAdminActionNotification(
            user.email,
            user.firstName || 'User',
            action.actionType,
            'EXECUTED',
            {
              actionId: id,
              title: action.title,
              description: action.description,
              executedBy: executorAddress,
              transactionHash: executeActionDto.transactionHash,
              timestamp: new Date().toISOString(),
              actionUrl: `${this.configService.get('app.url')}/admin/actions/${id}`,
            },
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send email notification for action execution: ${id}`, error);
      }

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to execute admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async cancelAction(id: string, reason: string, cancellerAddress: string): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status === AdminActionStatus.EXECUTED) {
        throw new BadRequestException('Cannot cancel an executed action');
      }

      action.status = AdminActionStatus.CANCELLED;
      action.cancelledAt = new Date();
      action.cancelledBy = cancellerAddress;
      action.cancellationReason = reason;

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action cancelled by ${cancellerAddress}: ${id}`);

      await this.notificationService.createNotification({
        userId: action.initiatorAddress,
        type: NotificationType.ADMIN_ACTION_CANCELLED,
        title: 'Admin Action Cancelled',
        content: `Your admin action "${action.actionType}" has been cancelled`,
        data: {
          actionId: id,
          cancelledBy: cancellerAddress,
          reason: reason,
        },
      });

      try {
        const user = await this.userRepository.findOne({
          where: { walletAddress: action.initiatorAddress },
        });
        if (user && user.email) {
          await this.emailService.sendAdminActionNotification(
            user.email,
            user.firstName || 'User',
            action.actionType,
            'CANCELLED',
            {
              actionId: id,
              title: action.title,
              description: action.description,
              cancelledBy: cancellerAddress,
              reason: reason,
              timestamp: new Date().toISOString(),
              actionUrl: `${this.configService.get('app.url')}/admin/actions/${id}`,
            },
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send email notification for action cancellation: ${id}`,
          error,
        );
      }

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to cancel admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async getStatistics(): Promise<AdminActionStatisticsDto> {
    try {
      const total = await this.adminActionRepository.count();

      const statusCounts = {} as Record<AdminActionStatus, number>;
      for (const status of Object.values(AdminActionStatus)) {
        statusCounts[status] = await this.adminActionRepository.count({
          where: { status },
        });
      }

      const typeCounts = {} as Record<AdminActionType, number>;
      for (const type of Object.values(AdminActionType)) {
        typeCounts[type] = await this.adminActionRepository.count({
          where: { actionType: type },
        });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentActions = await this.adminActionRepository.count({
        where: {
          createdAt: thirtyDaysAgo as any,
        },
      });

      const approvedActions = await this.adminActionRepository.find({
        where: { status: AdminActionStatus.APPROVED },
        select: ['createdAt', 'approvedDate'],
      });

      let averageApprovalTimeHours = 0;
      if (approvedActions.length > 0) {
        const totalApprovalTime = approvedActions.reduce((sum, action) => {
          if (action.approvedDate) {
            return sum + (action.approvedDate.getTime() - action.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageApprovalTimeHours = totalApprovalTime / (approvedActions.length * 1000 * 60 * 60);
      }

      return {
        totalActions: total,
        actionsByStatus: statusCounts,
        actionsByType: typeCounts,
        recentActions,
        averageApprovalTimeHours: Math.round(averageApprovalTimeHours * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get admin action statistics', error);
      throw error;
    }
  }

  async getPendingActions(): Promise<AdminAction[]> {
    return this.adminActionRepository.find({
      where: { status: AdminActionStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async getReadyForExecution(): Promise<AdminAction[]> {
    return this.adminActionRepository.find({
      where: { status: AdminActionStatus.APPROVED },
      order: { approvedDate: 'DESC' },
    });
  }

  async getUserActions(walletAddress: string): Promise<AdminAction[]> {
    return this.adminActionRepository.find({
      where: { initiatorAddress: walletAddress },
      order: { createdAt: 'DESC' },
    });
  }

  async getRequiredApprovals(): Promise<number> {
    return 2;
  }

  async getMultiSigTransaction(transactionId: string): Promise<any> {
    return {
      transactionId,
      status: 'PENDING',
      confirmations: 1,
      requiredConfirmations: 2,
      destination: '0x1234567890123456789012345678901234567890',
      value: '0',
      data: '0x...',
      executed: false,
    };
  }

  async confirmMultiSigTransaction(transactionId: string, confirmerAddress: string): Promise<void> {
    this.logger.log(`Multi-sig transaction ${transactionId} confirmed by ${confirmerAddress}`);
  }

  async executeMultiSigTransaction(
    transactionId: string,
    executorAddress: string,
  ): Promise<string> {
    this.logger.log(`Multi-sig transaction ${transactionId} executed by ${executorAddress}`);
    return '0x' + '0'.repeat(64);
  }

  async syncActionWithMultiSig(id: string): Promise<AdminAction> {
    const action = await this.findOne(id);

    this.logger.log(`Syncing action ${id} with multi-sig wallet`);
    return action;
  }

  private async executeActionLogic(
    action: AdminAction,
    executeDto: ExecuteActionDto,
  ): Promise<void> {
    this.logger.log(`Executing action of type: ${action.actionType}`);

    switch (action.actionType) {
      case AdminActionType.MINT_LAND_PARCEL:
        this.logger.log('Executing land NFT minting');
        break;
      case AdminActionType.TRANSFER_OWNERSHIP:
        this.logger.log('Executing ownership transfer');
        break;
      case AdminActionType.UPDATE_SYSTEM_PARAMETERS:
        this.logger.log('Executing system parameter update');
        break;
      case AdminActionType.UPGRADE_CONTRACT:
        this.logger.log('Executing contract upgrade');
        break;
      case AdminActionType.EMERGENCY_PAUSE:
        this.logger.log('Executing emergency pause');
        break;
      default:
        this.logger.warn(`Unknown action type: ${action.actionType}`);
    }
  }

  private async notifyApprovers(action: AdminAction): Promise<void> {
    this.logger.log(`Notifying approvers for action: ${action.id}`);
  }

  private mapToResponseDto(action: AdminAction): AdminActionResponseDto {
    return {
      id: action.id,
      actionType: action.actionType,
      status: action.status,
      title: action.title,
      description: action.description,
      createdBy: action.initiatorAddress,
      requiredApprovals: action.requiredApprovals,
      approvals: action.approvals,
      rejections: action.rejections,
      createdAt: action.createdAt,
      approvedAt: action.approvedDate,
      executedAt: action.executedDate,
      executedBy: action.executorAddress,
      executionTxHash: action.executionTransactionHash,
    };
  }
}
