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
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import {
  CreateComplianceReportDto,
  UpdateComplianceReportDto,
  ComplianceReportFilterDto,
} from './dto/create-compliance-report.dto';
import { ComplianceReport } from './entities/compliance-report.entity';

@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('reports')
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Create new compliance report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Compliance report created successfully',
    type: ComplianceReport,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Land parcel not found',
  })
  async createReport(
    @Body(ValidationPipe) dto: CreateComplianceReportDto,
    @CurrentUser() user: User,
  ): Promise<ComplianceReport> {
    return this.complianceService.createReport(dto);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get all compliance reports with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance reports retrieved successfully',
  })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by compliance status' })
  @ApiQuery({ name: 'ruleType', required: false, description: 'Filter by rule type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query(ValidationPipe) filters: ComplianceReportFilterDto) {
    return this.complianceService.findAll(filters);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get compliance report by ID' })
  @ApiParam({ name: 'id', description: 'Compliance report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance report retrieved successfully',
    type: ComplianceReport,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Compliance report not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ComplianceReport> {
    return this.complianceService.findOne(id);
  }

  @Get('parcels/:parcelId/reports')
  @ApiOperation({ summary: 'Get all compliance reports for a specific parcel' })
  @ApiParam({ name: 'parcelId', description: 'Land parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parcel compliance reports retrieved successfully',
  })
  async findByParcel(@Param('parcelId', ParseUUIDPipe) parcelId: string): Promise<ComplianceReport[]> {
    return this.complianceService.findByParcel(parcelId);
  }

  @Put('reports/:id')
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Update compliance report' })
  @ApiParam({ name: 'id', description: 'Compliance report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance report updated successfully',
    type: ComplianceReport,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Compliance report not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateComplianceReportDto,
    @CurrentUser() user: User,
  ): Promise<ComplianceReport> {
    return this.complianceService.update(id, dto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get compliance statistics' })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance statistics retrieved successfully',
  })
  async getStatistics(@Query('parcelId') parcelId?: string) {
    return this.complianceService.getComplianceStatistics(parcelId);
  }

  @Get('reports/overdue/list')
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Get overdue compliance reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overdue compliance reports retrieved successfully',
  })
  async getOverdueReports(): Promise<ComplianceReport[]> {
    return this.complianceService.getOverdueReports();
  }

  @Put('reports/:id/review')
  @Roles('ADMIN', 'COMPLIANCE_OFFICER')
  @ApiOperation({ summary: 'Mark compliance report as reviewed' })
  @ApiParam({ name: 'id', description: 'Compliance report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance report marked as reviewed',
    type: ComplianceReport,
  })
  async markAsReviewed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reviewNotes') reviewNotes: string,
    @CurrentUser() user: User,
  ): Promise<ComplianceReport> {
    return this.complianceService.markAsReviewed(id, user.id, reviewNotes);
  }
}

