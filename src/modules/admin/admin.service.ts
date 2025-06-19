import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AdminAction, ActionType, ActionStatus } from './entities/admin-action.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateAdminActionDto,
  UpdateAdminActionDto,
  ApproveActionDto,
  RejectActionDto,
  ExecuteActionDto,
  AdminActionResponseDto,
  AdminActionListResponseDto,
  AdminActionStatisticsDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
  ) {}

  async createAction(createAdminActionDto: CreateAdminActionDto): Promise<AdminAction> {
    try {
      // Store action data in IPFS for immutability
      const ipfsHash = await this.ipfsService.uploadJson({
        actionType: createAdminActionDto.actionType,
        actionData: createAdminActionDto.actionData,
        reason: createAdminActionDto.reason,
        createdAt: new Date().toISOString(),
      });

      const adminAction = this.adminActionRepository.create({
        ...createAdminActionDto,
        ipfsHash,
        status: ActionStatus.PENDING,
        approvals: [],
        rejections: [],
      });

      const savedAction = await this.adminActionRepository.save(adminAction);
      this.logger.log(`Admin action created with ID: ${savedAction.id}`);

      // Send notifications to required approvers
      await this.notifyApprovers(savedAction);

      return savedAction;
    } catch (error) {
      this.logger.error('Failed to create admin action', error);
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    actionType?: ActionType,
    status?: ActionStatus,
    createdBy?: string,
  ): Promise<AdminActionListResponseDto> {
    try {
      const where: FindOptionsWhere<AdminAction> = {};
      
      if (actionType) where.actionType = actionType;
      if (status) where.status = status;
      if (createdBy) where.createdBy = createdBy;

      const [actions, total] = await this.adminActionRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        actions: actions.map(action => this.mapToResponseDto(action)),
        total,
        page,
        limit,
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

      // Only allow updates if action is still pending
      if (action.status !== ActionStatus.PENDING) {
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

  async approve(id: string, approveActionDto: ApproveActionDto): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== ActionStatus.PENDING) {
        throw new BadRequestException('Action is not pending approval');
      }

      // Check if user has already approved
      if (action.approvals.includes(approveActionDto.approvedBy)) {
        throw new BadRequestException('User has already approved this action');
      }

      // Add approval
      action.approvals.push(approveActionDto.approvedBy);
      action.approvalComments = action.approvalComments || {};
      action.approvalComments[approveActionDto.approvedBy] = approveActionDto.comment;

      // Check if we have enough approvals
      if (action.approvals.length >= action.requiredApprovals) {
        action.status = ActionStatus.APPROVED;
        action.approvedAt = new Date();
      }

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action approved by ${approveActionDto.approvedBy}: ${id}`);

      // Send notification about approval
      await this.notificationService.create({
        userId: action.createdBy,
        type: 'ADMIN_ACTION_APPROVED',
        title: 'Admin Action Approved',
        message: `Your admin action "${action.actionType}" has been approved by ${approveActionDto.approvedBy}`,
        data: { actionId: id, approvedBy: approveActionDto.approvedBy },
      });

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to approve admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async reject(id: string, rejectActionDto: RejectActionDto): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== ActionStatus.PENDING) {
        throw new BadRequestException('Action is not pending approval');
      }

      // Check if user has already rejected
      if (action.rejections.includes(rejectActionDto.rejectedBy)) {
        throw new BadRequestException('User has already rejected this action');
      }

      // Add rejection
      action.rejections.push(rejectActionDto.rejectedBy);
      action.rejectionComments = action.rejectionComments || {};
      action.rejectionComments[rejectActionDto.rejectedBy] = rejectActionDto.reason;

      action.status = ActionStatus.REJECTED;
      action.rejectedAt = new Date();

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action rejected by ${rejectActionDto.rejectedBy}: ${id}`);

      // Send notification about rejection
      await this.notificationService.create({
        userId: action.createdBy,
        type: 'ADMIN_ACTION_REJECTED',
        title: 'Admin Action Rejected',
        message: `Your admin action "${action.actionType}" has been rejected by ${rejectActionDto.rejectedBy}`,
        data: { actionId: id, rejectedBy: rejectActionDto.rejectedBy, reason: rejectActionDto.reason },
      });

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to reject admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async execute(id: string, executeActionDto: ExecuteActionDto): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status !== ActionStatus.APPROVED) {
        throw new BadRequestException('Action must be approved before execution');
      }

      // Execute the action based on its type
      await this.executeActionLogic(action, executeActionDto);

      action.status = ActionStatus.EXECUTED;
      action.executedAt = new Date();
      action.executedBy = executeActionDto.executedBy;
      action.executionTxHash = executeActionDto.transactionHash;
      action.executionNotes = executeActionDto.notes;

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action executed by ${executeActionDto.executedBy}: ${id}`);

      // Send notification about execution
      await this.notificationService.create({
        userId: action.createdBy,
        type: 'ADMIN_ACTION_EXECUTED',
        title: 'Admin Action Executed',
        message: `Your admin action "${action.actionType}" has been executed successfully`,
        data: { 
          actionId: id, 
          executedBy: executeActionDto.executedBy,
          transactionHash: executeActionDto.transactionHash,
        },
      });

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to execute admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async cancel(id: string, cancelledBy: string, reason: string): Promise<AdminAction> {
    try {
      const action = await this.findOne(id);

      if (action.status === ActionStatus.EXECUTED) {
        throw new BadRequestException('Cannot cancel an executed action');
      }

      action.status = ActionStatus.CANCELLED;
      action.cancelledAt = new Date();
      action.cancelledBy = cancelledBy;
      action.cancellationReason = reason;

      const updatedAction = await this.adminActionRepository.save(action);
      this.logger.log(`Admin action cancelled by ${cancelledBy}: ${id}`);

      return updatedAction;
    } catch (error) {
      this.logger.error(`Failed to cancel admin action with ID: ${id}`, error);
      throw error;
    }
  }

  async getStatistics(): Promise<AdminActionStatisticsDto> {
    try {
      const total = await this.adminActionRepository.count();
      
      const statusCounts = {} as Record<ActionStatus, number>;
      for (const status of Object.values(ActionStatus)) {
        statusCounts[status] = await this.adminActionRepository.count({
          where: { status },
        });
      }

      const typeCounts = {} as Record<ActionType, number>;
      for (const type of Object.values(ActionType)) {
        typeCounts[type] = await this.adminActionRepository.count({
          where: { actionType: type },
        });
      }

      // Get recent actions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentActions = await this.adminActionRepository.count({
        where: {
          createdAt: thirtyDaysAgo as any, // TypeORM date comparison
        },
      });

      // Calculate average approval time
      const approvedActions = await this.adminActionRepository.find({
        where: { status: ActionStatus.APPROVED },
        select: ['createdAt', 'approvedAt'],
      });

      let averageApprovalTimeHours = 0;
      if (approvedActions.length > 0) {
        const totalApprovalTime = approvedActions.reduce((sum, action) => {
          if (action.approvedAt) {
            return sum + (action.approvedAt.getTime() - action.createdAt.getTime());
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

  private async executeActionLogic(action: AdminAction, executeDto: ExecuteActionDto): Promise<void> {
    // This method would contain the actual execution logic for different action types
    // For now, we'll just log the execution
    this.logger.log(`Executing action of type: ${action.actionType}`);
    
    switch (action.actionType) {
      case ActionType.MINT_LAND_NFT:
        // Logic to mint land NFT
        this.logger.log('Executing land NFT minting');
        break;
      case ActionType.UPDATE_SYSTEM_PARAMETERS:
        // Logic to update system parameters
        this.logger.log('Executing system parameter update');
        break;
      case ActionType.FLAG_PARCEL_EXPROPRIATION:
        // Logic to flag parcel for expropriation
        this.logger.log('Executing parcel expropriation flagging');
        break;
      case ActionType.EMERGENCY_PAUSE:
        // Logic to pause system
        this.logger.log('Executing emergency pause');
        break;
      case ActionType.UPGRADE_CONTRACT:
        // Logic to upgrade contract
        this.logger.log('Executing contract upgrade');
        break;
      default:
        this.logger.warn(`Unknown action type: ${action.actionType}`);
    }
  }

  private async notifyApprovers(action: AdminAction): Promise<void> {
    // This would notify all required approvers about the new action
    // For now, we'll just log it
    this.logger.log(`Notifying approvers for action: ${action.id}`);
  }

  private mapToResponseDto(action: AdminAction): AdminActionResponseDto {
    return {
      id: action.id,
      actionType: action.actionType,
      status: action.status,
      title: action.title,
      description: action.description,
      createdBy: action.createdBy,
      requiredApprovals: action.requiredApprovals,
      approvals: action.approvals,
      rejections: action.rejections,
      createdAt: action.createdAt,
      approvedAt: action.approvedAt,
      executedAt: action.executedAt,
      executedBy: action.executedBy,
      executionTxHash: action.executionTxHash,
    };
  }
}
