import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user-role.entity';
import {
  SystemOverviewDto,
  LandManagementAnalyticsDto,
  GovernanceAnalyticsDto,
  UserAnalyticsDto,
  TransactionAnalyticsDto,
  ComplianceAnalyticsDto,
  PerformanceMetricsDto,
  TrendAnalysisDto,
} from './dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('system-overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get system overview analytics' })
  @ApiResponse({ status: 200, description: 'System overview retrieved successfully', type: SystemOverviewDto })
  async getSystemOverview() {
    try {
      return await this.analyticsService.getSystemOverview();
    } catch (error) {
      throw new HttpException(
        `Failed to get system overview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('land-management')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.LAND_OFFICER)
  @ApiOperation({ summary: 'Get land management analytics' })
  @ApiResponse({ status: 200, description: 'Land management analytics retrieved successfully', type: LandManagementAnalyticsDto })
  async getLandManagementAnalytics() {
    try {
      return await this.analyticsService.getLandManagementAnalytics();
    } catch (error) {
      throw new HttpException(
        `Failed to get land management analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('governance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.DAO_MEMBER)
  @ApiOperation({ summary: 'Get governance analytics' })
  @ApiResponse({ status: 200, description: 'Governance analytics retrieved successfully', type: GovernanceAnalyticsDto })
  async getGovernanceAnalytics() {
    try {
      return await this.analyticsService.getGovernanceAnalytics();
    } catch (error) {
      throw new HttpException(
        `Failed to get governance analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully', type: UserAnalyticsDto })
  async getUserAnalytics() {
    try {
      return await this.analyticsService.getUserAnalytics();
    } catch (error) {
      throw new HttpException(
        `Failed to get user analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get transaction analytics' })
  @ApiResponse({ status: 200, description: 'Transaction analytics retrieved successfully', type: TransactionAnalyticsDto })
  async getTransactionAnalytics() {
    try {
      return await this.analyticsService.getTransactionAnalytics();
    } catch (error) {
      throw new HttpException(
        `Failed to get transaction analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('compliance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get compliance analytics' })
  @ApiResponse({ status: 200, description: 'Compliance analytics retrieved successfully', type: ComplianceAnalyticsDto })
  async getComplianceAnalytics() {
    try {
      return await this.analyticsService.getComplianceAnalytics();
    } catch (error) {
      throw new HttpException(
        `Failed to get compliance analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SYSTEM)
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully', type: PerformanceMetricsDto })
  async getPerformanceMetrics() {
    try {
      return await this.analyticsService.getPerformanceMetrics();
    } catch (error) {
      throw new HttpException(
        `Failed to get performance metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('trends')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get trend analysis' })
  @ApiResponse({ status: 200, description: 'Trend analysis retrieved successfully', type: TrendAnalysisDto })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days for trend analysis (default: 30)' })
  async getTrendAnalysis(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ) {
    try {
      return await this.analyticsService.getTrendAnalysis(days);
    } catch (error) {
      throw new HttpException(
        `Failed to get trend analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get comprehensive dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData() {
    try {
      const [
        systemOverview,
        landManagement,
        governance,
        users,
        transactions,
        compliance,
        performance,
      ] = await Promise.all([
        this.analyticsService.getSystemOverview(),
        this.analyticsService.getLandManagementAnalytics(),
        this.analyticsService.getGovernanceAnalytics(),
        this.analyticsService.getUserAnalytics(),
        this.analyticsService.getTransactionAnalytics(),
        this.analyticsService.getComplianceAnalytics(),
        this.analyticsService.getPerformanceMetrics(),
      ]);

      return {
        systemOverview,
        landManagement,
        governance,
        users,
        transactions,
        compliance,
        performance,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get dashboard data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  async getHealthCheck() {
    try {
      const systemOverview = await this.analyticsService.getSystemOverview();
      const performance = await this.analyticsService.getPerformanceMetrics();

      return {
        status: systemOverview.systemHealth > 80 ? 'healthy' : 'warning',
        health: systemOverview.systemHealth,
        uptime: performance.systemUptime,
        responseTime: performance.averageResponseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get health check: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
