import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AdminActionType, AdminActionStatus } from '../entities/admin-action.entity';

export class CreateAdminActionDto {
  @ApiProperty({ description: 'Action type', enum: AdminActionType })
  @IsEnum(AdminActionType)
  actionType: AdminActionType;

  @ApiProperty({ description: 'Action title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Action description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Target contract address' })
  @IsOptional()
  @IsString()
  targetContract?: string;

  @ApiPropertyOptional({ description: 'Function signature to call' })
  @IsOptional()
  @IsString()
  functionSignature?: string;

  @ApiPropertyOptional({ description: 'Function parameters' })
  @IsOptional()
  @IsArray()
  parameters?: any[];

  @ApiPropertyOptional({ description: 'Value to send with transaction', default: '0' })
  @IsOptional()
  @IsString()
  value?: string = '0';

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class UpdateAdminActionDto {
  @ApiPropertyOptional({ description: 'Action status', enum: AdminActionStatus })
  @IsOptional()
  @IsEnum(AdminActionStatus)
  status?: AdminActionStatus;

  @ApiPropertyOptional({ description: 'Action title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Action description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target contract address' })
  @IsOptional()
  @IsString()
  targetContract?: string;

  @ApiPropertyOptional({ description: 'Function signature to call' })
  @IsOptional()
  @IsString()
  functionSignature?: string;

  @ApiPropertyOptional({ description: 'Function parameters' })
  @IsOptional()
  @IsArray()
  parameters?: any[];

  @ApiPropertyOptional({ description: 'Value to send with transaction' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Approval date' })
  @IsOptional()
  @IsDateString()
  approvedDate?: string;

  @ApiPropertyOptional({ description: 'Execution date' })
  @IsOptional()
  @IsDateString()
  executedDate?: string;

  @ApiPropertyOptional({ description: 'Rejection date' })
  @IsOptional()
  @IsDateString()
  rejectedDate?: string;

  @ApiPropertyOptional({ description: 'Executor address' })
  @IsOptional()
  @IsString()
  executorAddress?: string;

  @ApiPropertyOptional({ description: 'Execution transaction hash' })
  @IsOptional()
  @IsString()
  executionTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Multi-sig transaction ID' })
  @IsOptional()
  @IsString()
  multiSigTransactionId?: string;

  @ApiPropertyOptional({ description: 'Multi-sig confirmations' })
  @IsOptional()
  @IsArray()
  multiSigConfirmations?: string[];

  @ApiPropertyOptional({ description: 'Multi-sig confirmation count' })
  @IsOptional()
  multiSigConfirmationCount?: number;

  @ApiPropertyOptional({ description: 'Addresses that approved this action' })
  @IsOptional()
  @IsArray()
  approvals?: string[];

  @ApiPropertyOptional({ description: 'Addresses that rejected this action' })
  @IsOptional()
  @IsArray()
  rejections?: string[];

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Approver notes' })
  @IsOptional()
  @IsString()
  approverNotes?: string;

  @ApiPropertyOptional({ description: 'Execution notes' })
  @IsOptional()
  @IsString()
  executionNotes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class AdminActionFilterDto {
  @ApiPropertyOptional({ description: 'Filter by action type', enum: AdminActionType })
  @IsOptional()
  @IsEnum(AdminActionType)
  actionType?: AdminActionType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: AdminActionStatus })
  @IsOptional()
  @IsEnum(AdminActionStatus)
  status?: AdminActionStatus;

  @ApiPropertyOptional({ description: 'Filter by initiator address' })
  @IsOptional()
  @IsString()
  initiatorAddress?: string;

  @ApiPropertyOptional({ description: 'Filter by target contract' })
  @IsOptional()
  @IsString()
  targetContract?: string;

  @ApiPropertyOptional({ description: 'Filter from creation date' })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to creation date' })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @ApiPropertyOptional({ description: 'Show only pending actions' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  pendingOnly?: boolean;

  @ApiPropertyOptional({ description: 'Show only actions ready for execution' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  readyForExecution?: boolean;

  @ApiPropertyOptional({ description: 'Include audit information' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeAuditInfo?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ApproveActionDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExecuteActionDto {
  @ApiProperty({ description: 'Execution transaction hash' })
  @IsString()
  executionTransactionHash: string;

  @ApiPropertyOptional({ description: 'Execution notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

