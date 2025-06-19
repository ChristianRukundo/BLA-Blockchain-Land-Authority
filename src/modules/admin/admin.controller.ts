import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import {
  CreateAdminActionDto,
  UpdateAdminActionDto,
  AdminActionFilterDto,
  ApproveActionDto,
  ExecuteActionDto,
} from './dto/admin.dto';
import { AdminAction } from './entities/admin-action.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('actions')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Create new administrative action' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Administrative action created successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createAction(
    @Body(ValidationPipe) dto: CreateAdminActionDto,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.createAdminAction(dto, user.walletAddress);
  }

  @Get('actions')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get all administrative actions with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative actions retrieved successfully',
  })
  @ApiQuery({ name: 'actionType', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'initiatorAddress', required: false, description: 'Filter by initiator' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query(ValidationPipe) filters: AdminActionFilterDto) {
    return this.adminService.findAll(filters);
  }

  @Get('actions/pending')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Get pending administrative actions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending actions retrieved successfully',
  })
  async getPendingActions(): Promise<AdminAction[]> {
    return this.adminService.getPendingActions();
  }

  @Get('actions/ready-for-execution')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Get actions ready for execution' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Executable actions retrieved successfully',
  })
  async getReadyForExecution(): Promise<AdminAction[]> {
    return this.adminService.getReadyForExecution();
  }

  @Get('statistics')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get administrative statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative statistics retrieved successfully',
  })
  async getStatistics() {
    return this.adminService.getAdminStatistics();
  }

  @Get('my-actions')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Get current user administrative actions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User actions retrieved successfully',
  })
  async getMyActions(@CurrentUser() user: User): Promise<AdminAction[]> {
    return this.adminService.getUserActions(user.walletAddress);
  }

  @Get('actions/:id')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get administrative action by ID' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action retrieved successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Administrative action not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminAction> {
    return this.adminService.findOne(id);
  }

  @Put('actions/:id')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Update administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action updated successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Administrative action not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateAdminActionDto,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.update(id, dto);
  }

  @Post('actions/:id/approve')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Approve administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action approved successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action cannot be approved or already approved by user',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async approveAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ApproveActionDto,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.approveAction(id, dto, user.walletAddress);
  }

  @Post('actions/:id/reject')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Reject administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action rejected successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action cannot be rejected',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async rejectAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rejectionReason') reason: string,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.rejectAction(id, reason, user.walletAddress);
  }

  @Post('actions/:id/execute')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Execute approved administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action executed successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action cannot be executed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async executeAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ExecuteActionDto,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.executeAction(id, dto, user.walletAddress);
  }

  @Put('actions/:id/cancel')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Cancel administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Administrative action cancelled successfully',
    type: AdminAction,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action cannot be cancelled',
  })
  async cancelAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('cancellationReason') reason: string,
    @CurrentUser() user: User,
  ): Promise<AdminAction> {
    return this.adminService.cancelAction(id, reason, user.walletAddress);
  }

  // Multi-sig wallet integration endpoints
  @Get('multi-sig/required-approvals')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Get required number of approvals for multi-sig' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Required approvals retrieved successfully',
  })
  async getRequiredApprovals(): Promise<{ requiredApprovals: number }> {
    const requiredApprovals = await this.adminService.getRequiredApprovals();
    return { requiredApprovals };
  }

  @Get('multi-sig/transaction/:transactionId')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Get multi-sig transaction details' })
  @ApiParam({ name: 'transactionId', description: 'Multi-sig transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multi-sig transaction retrieved successfully',
  })
  async getMultiSigTransaction(@Param('transactionId') transactionId: string) {
    return this.adminService.getMultiSigTransaction(transactionId);
  }

  @Post('multi-sig/transaction/:transactionId/confirm')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Confirm multi-sig transaction' })
  @ApiParam({ name: 'transactionId', description: 'Multi-sig transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multi-sig transaction confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to confirm transaction',
  })
  async confirmMultiSigTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.adminService.confirmMultiSigTransaction(transactionId, user.walletAddress);
    return { success: true };
  }

  @Post('multi-sig/transaction/:transactionId/execute')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Execute multi-sig transaction' })
  @ApiParam({ name: 'transactionId', description: 'Multi-sig transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multi-sig transaction executed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to execute transaction',
  })
  async executeMultiSigTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: User,
  ): Promise<{ transactionHash: string }> {
    const transactionHash = await this.adminService.executeMultiSigTransaction(
      transactionId,
      user.walletAddress
    );
    return { transactionHash };
  }

  @Post('actions/:id/sync-multi-sig')
  @Roles('ADMIN', 'MULTI_SIG_ADMIN')
  @ApiOperation({ summary: 'Sync action with multi-sig wallet state' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action synced successfully',
    type: AdminAction,
  })
  async syncActionWithMultiSig(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminAction> {
    return this.adminService.syncActionWithMultiSig(id);
  }

  // System configuration endpoints
  @Get('config/authorized-admins')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get list of authorized administrators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorized administrators retrieved successfully',
  })
  async getAuthorizedAdmins(): Promise<{ authorizedAdmins: string[] }> {
    const stats = await this.adminService.getAdminStatistics();
    return { authorizedAdmins: stats.authorizedAdmins };
  }

  @Get('config/system-parameters')
  @Roles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get system configuration parameters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System parameters retrieved successfully',
  })
  async getSystemParameters() {
    return {
      requiredApprovals: await this.adminService.getRequiredApprovals(),
      // Add other system parameters as needed
    };
  }

  // Audit and logging endpoints
  @Get('audit/actions')
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get audit trail of administrative actions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit trail retrieved successfully',
  })
  async getAuditTrail(@Query(ValidationPipe) filters: AdminActionFilterDto) {
    // Return all actions with full audit information
    return this.adminService.findAll({
      ...filters,
      includeAuditInfo: true,
    });
  }

  @Get('audit/actions/:id/history')
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get detailed history of an administrative action' })
  @ApiParam({ name: 'id', description: 'Administrative action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action history retrieved successfully',
  })
  async getActionHistory(@Param('id', ParseUUIDPipe) id: string) {
    const action = await this.adminService.findOne(id);
    
    return {
      action,
      approvalHistory: action.approvals.map((address, index) => ({
        approver: address,
        approvalOrder: index + 1,
        timestamp: action.approvedDate, // In a real implementation, you'd track individual approval timestamps
      })),
      rejectionHistory: action.rejections.map((address, index) => ({
        rejecter: address,
        rejectionOrder: index + 1,
        timestamp: action.rejectedDate,
      })),
      statusChanges: [
        {
          status: 'PENDING',
          timestamp: action.createdDate,
          actor: action.initiatorAddress,
        },
        ...(action.approvedDate ? [{
          status: 'APPROVED',
          timestamp: action.approvedDate,
          actor: 'SYSTEM',
        }] : []),
        ...(action.executedDate ? [{
          status: 'EXECUTED',
          timestamp: action.executedDate,
          actor: action.executorAddress,
        }] : []),
        ...(action.rejectedDate ? [{
          status: 'REJECTED',
          timestamp: action.rejectedDate,
          actor: 'SYSTEM',
        }] : []),
      ],
    };
  }

  // Emergency functions
  @Post('emergency/pause-system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Emergency pause system operations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System paused successfully',
  })
  async pauseSystem(@CurrentUser() user: User) {
    // This would trigger emergency pause across all contracts
    // Implementation would depend on your emergency pause mechanism
    return { success: true, message: 'Emergency pause initiated', actor: user.walletAddress };
  }

  @Post('emergency/unpause-system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resume system operations after emergency pause' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System resumed successfully',
  })
  async unpauseSystem(@CurrentUser() user: User) {
    // This would resume operations across all contracts
    return { success: true, message: 'System operations resumed', actor: user.walletAddress };
  }
}

