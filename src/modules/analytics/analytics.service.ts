import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaisService } from '../lais/lais.service';
import { GovernanceService } from '../governance/governance.service';
import { InheritanceService } from '../inheritance/inheritance.service';
import { ExpropriationService } from '../expropriation/expropriation.service';
import { ComplianceService } from '../compliance/compliance.service';
import { DisputeService } from '../dispute/dispute.service';
import { AdminService } from '../admin/admin.service';
import { UserProfileService } from '../user-profile/user-profile.service';
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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly laisService: LaisService,
    private readonly governanceService: GovernanceService,
    private readonly inheritanceService: InheritanceService,
    private readonly expropriationService: ExpropriationService,
    private readonly complianceService: ComplianceService,
    private readonly disputeService: DisputeService,
    private readonly adminService: AdminService,
    private readonly userProfileService: UserProfileService,
  ) {}

  async getSystemOverview(): Promise<SystemOverviewDto> {
    try {
      this.logger.log('Generating system overview analytics');

      const [
        landStats,
        governanceStats,
        inheritanceStats,
        expropriationStats,
        complianceStats,
        disputeStats,
        adminStats,
        userStats,
      ] = await Promise.all([
        this.laisService.getLandParcelStatistics(),
        this.governanceService.getGovernanceStatistics(),
        this.inheritanceService.getStatistics(),
        this.expropriationService.getStatistics(),
        this.complianceService.getStatistics(),
        this.disputeService.getStatistics(),
        this.adminService.getStatistics(),
        this.userProfileService.getStatistics(),
      ]);

      return {
        totalLandParcels: landStats.totalParcels,
        totalUsers: userStats.totalProfiles,
        activeGovernanceProposals: governanceStats.activeProposals,
        pendingInheritanceRequests: inheritanceStats.requestsByStatus.PENDING || 0,
        activeExpropriations: expropriationStats.expropriationsByStatus.ACTIVE || 0,
        openDisputes: disputeStats.disputesByStatus.OPEN || 0,
        pendingAdminActions: adminStats.actionsByStatus.PENDING || 0,
        systemHealth: this.calculateSystemHealth({
          landStats,
          governanceStats,
          userStats,
        }),
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to generate system overview', error);
      throw error;
    }
  }

  async getLandManagementAnalytics(): Promise<LandManagementAnalyticsDto> {
    try {
      this.logger.log('Generating land management analytics');

      const [landStats, cadastralStats] = await Promise.all([
        this.laisService.getLandParcelStatistics(),
        this.laisService.getCadastralDataStatistics(),
      ]);

      // Calculate land utilization metrics
      const totalArea = landStats.totalArea;
      const utilizationByType = {};
      for (const [landUse, count] of Object.entries(landStats.parcelsByLandUse)) {
        utilizationByType[landUse] = {
          count,
          percentage: totalArea > 0 ? (count / landStats.totalParcels) * 100 : 0,
        };
      }

      // Calculate geographic distribution (mock data for now)
      const geographicDistribution = {
        districts: {
          'Kigali': { parcels: Math.floor(landStats.totalParcels * 0.3), area: totalArea * 0.25 },
          'Eastern': { parcels: Math.floor(landStats.totalParcels * 0.25), area: totalArea * 0.3 },
          'Western': { parcels: Math.floor(landStats.totalParcels * 0.2), area: totalArea * 0.2 },
          'Northern': { parcels: Math.floor(landStats.totalParcels * 0.15), area: totalArea * 0.15 },
          'Southern': { parcels: Math.floor(landStats.totalParcels * 0.1), area: totalArea * 0.1 },
        },
      };

      return {
        totalParcels: landStats.totalParcels,
        totalArea: totalArea,
        averageParcelSize: landStats.averageArea,
        parcelsByLandUse: landStats.parcelsByLandUse,
        utilizationByType,
        geographicDistribution,
        cadastralDataQuality: {
          totalRecords: cadastralStats.totalRecords,
          verifiedRecords: cadastralStats.verifiedRecords,
          verificationRate: cadastralStats.totalRecords > 0 
            ? (cadastralStats.verifiedRecords / cadastralStats.totalRecords) * 100 
            : 0,
          recordsByQuality: cadastralStats.recordsByQuality,
        },
        complianceOverview: landStats.parcelsByComplianceStatus,
        expropriationOverview: landStats.parcelsByExpropriationStatus,
      };
    } catch (error) {
      this.logger.error('Failed to generate land management analytics', error);
      throw error;
    }
  }

  async getGovernanceAnalytics(): Promise<GovernanceAnalyticsDto> {
    try {
      this.logger.log('Generating governance analytics');

      const governanceStats = await this.governanceService.getGovernanceStatistics();

      // Calculate participation trends (mock data for demonstration)
      const participationTrends = {
        last30Days: Math.floor(governanceStats.averageParticipation * 1.1),
        last60Days: Math.floor(governanceStats.averageParticipation * 0.95),
        last90Days: Math.floor(governanceStats.averageParticipation * 0.9),
      };

      // Calculate proposal success rate
      const totalProposals = governanceStats.totalProposals;
      const executedProposals = governanceStats.proposalsByStatus.EXECUTED || 0;
      const successRate = totalProposals > 0 ? (executedProposals / totalProposals) * 100 : 0;

      return {
        totalProposals: governanceStats.totalProposals,
        activeProposals: governanceStats.activeProposals,
        proposalsByStatus: governanceStats.proposalsByStatus,
        proposalsByType: governanceStats.proposalsByType,
        totalVoters: governanceStats.totalVoters,
        totalVotingPower: governanceStats.totalVotingPower,
        averageParticipation: governanceStats.averageParticipation,
        participationTrends,
        proposalSuccessRate: successRate,
        recentProposals: governanceStats.recentProposals,
      };
    } catch (error) {
      this.logger.error('Failed to generate governance analytics', error);
      throw error;
    }
  }

  async getUserAnalytics(): Promise<UserAnalyticsDto> {
    try {
      this.logger.log('Generating user analytics');

      const userStats = await this.userProfileService.getStatistics();

      // Calculate user activity metrics (mock data for demonstration)
      const activityMetrics = {
        dailyActiveUsers: Math.floor(userStats.totalProfiles * 0.15),
        weeklyActiveUsers: Math.floor(userStats.totalProfiles * 0.4),
        monthlyActiveUsers: Math.floor(userStats.totalProfiles * 0.7),
      };

      // Calculate user growth trends
      const growthTrends = {
        newUsersThisMonth: userStats.recentProfiles,
        growthRate: userStats.totalProfiles > 0 
          ? (userStats.recentProfiles / userStats.totalProfiles) * 100 
          : 0,
      };

      return {
        totalUsers: userStats.totalProfiles,
        usersByStatus: userStats.profilesByStatus,
        usersByKYCStatus: userStats.profilesByKYCStatus,
        verifiedUsers: userStats.verifiedProfiles,
        verificationRate: userStats.totalProfiles > 0 
          ? (userStats.verifiedProfiles / userStats.totalProfiles) * 100 
          : 0,
        activityMetrics,
        growthTrends,
        recentRegistrations: userStats.recentProfiles,
      };
    } catch (error) {
      this.logger.error('Failed to generate user analytics', error);
      throw error;
    }
  }

  async getTransactionAnalytics(): Promise<TransactionAnalyticsDto> {
    try {
      this.logger.log('Generating transaction analytics');

      // This would typically aggregate data from blockchain transactions
      // For now, we'll provide mock data based on system activities
      const [adminStats, governanceStats, inheritanceStats, expropriationStats] = await Promise.all([
        this.adminService.getStatistics(),
        this.governanceService.getGovernanceStatistics(),
        this.inheritanceService.getStatistics(),
        this.expropriationService.getStatistics(),
      ]);

      const totalTransactions = 
        adminStats.totalActions + 
        governanceStats.totalProposals + 
        inheritanceStats.totalRequests + 
        expropriationStats.totalExpropriations;

      // Mock transaction volume data
      const transactionVolume = {
        daily: Math.floor(totalTransactions * 0.05),
        weekly: Math.floor(totalTransactions * 0.2),
        monthly: Math.floor(totalTransactions * 0.6),
      };

      const transactionsByType = {
        landTransfers: inheritanceStats.totalInheritances,
        governanceVotes: governanceStats.totalVoters,
        adminActions: adminStats.totalActions,
        expropriations: expropriationStats.totalExpropriations,
      };

      return {
        totalTransactions,
        transactionVolume,
        transactionsByType,
        averageTransactionTime: 2.5, // Mock average time in minutes
        successRate: 98.5, // Mock success rate percentage
        gasUsageMetrics: {
          totalGasUsed: totalTransactions * 150000, // Mock gas usage
          averageGasPerTransaction: 150000,
          gasOptimizationSavings: 15.2, // Mock percentage savings
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate transaction analytics', error);
      throw error;
    }
  }

  async getComplianceAnalytics(): Promise<ComplianceAnalyticsDto> {
    try {
      this.logger.log('Generating compliance analytics');

      const [complianceStats, landStats] = await Promise.all([
        this.complianceService.getStatistics(),
        this.laisService.getLandParcelStatistics(),
      ]);

      const complianceRate = landStats.totalParcels > 0 
        ? ((landStats.parcelsByComplianceStatus.COMPLIANT || 0) / landStats.totalParcels) * 100 
        : 0;

      const violationTrends = {
        newViolations: complianceStats.recentReports,
        resolvedViolations: complianceStats.reportsByStatus.RESOLVED || 0,
        pendingViolations: complianceStats.reportsByStatus.PENDING || 0,
      };

      return {
        overallComplianceRate: complianceRate,
        complianceByLandUse: this.calculateComplianceByLandUse(landStats),
        violationTrends,
        complianceReports: complianceStats.totalReports,
        reportsByStatus: complianceStats.reportsByStatus,
        reportsByType: complianceStats.reportsByType,
        averageResolutionTime: complianceStats.averageResolutionTimeHours,
        recentActivity: complianceStats.recentReports,
      };
    } catch (error) {
      this.logger.error('Failed to generate compliance analytics', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetricsDto> {
    try {
      this.logger.log('Generating performance metrics');

      // Mock performance data - in a real system, this would come from monitoring tools
      return {
        systemUptime: 99.8,
        averageResponseTime: 245, // milliseconds
        throughput: {
          requestsPerSecond: 150,
          transactionsPerMinute: 45,
        },
        resourceUtilization: {
          cpuUsage: 35.2,
          memoryUsage: 68.7,
          diskUsage: 42.1,
          networkUsage: 23.4,
        },
        databaseMetrics: {
          connectionPoolUsage: 45.6,
          queryPerformance: 89.3,
          indexEfficiency: 94.2,
        },
        blockchainMetrics: {
          blockTime: 2.1, // seconds
          gasPrice: 20, // gwei
          networkCongestion: 15.3, // percentage
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate performance metrics', error);
      throw error;
    }
  }

  async getTrendAnalysis(days: number = 30): Promise<TrendAnalysisDto> {
    try {
      this.logger.log(`Generating trend analysis for ${days} days`);

      // Mock trend data - in a real system, this would analyze historical data
      const trends = {
        landRegistrations: this.generateMockTrend(days, 5, 15),
        userGrowth: this.generateMockTrend(days, 2, 8),
        governanceParticipation: this.generateMockTrend(days, 10, 25),
        complianceViolations: this.generateMockTrend(days, 1, 5),
        disputeResolutions: this.generateMockTrend(days, 0, 3),
      };

      return {
        period: `${days} days`,
        trends,
        insights: this.generateInsights(trends),
        predictions: this.generatePredictions(trends),
      };
    } catch (error) {
      this.logger.error('Failed to generate trend analysis', error);
      throw error;
    }
  }

  private calculateSystemHealth(stats: any): number {
    // Simple health calculation based on various metrics
    let healthScore = 100;

    // Deduct points for issues
    if (stats.landStats.totalParcels === 0) healthScore -= 20;
    if (stats.userStats.totalProfiles < 10) healthScore -= 15;
    if (stats.governanceStats.activeProposals === 0) healthScore -= 10;

    return Math.max(0, Math.min(100, healthScore));
  }

  private calculateComplianceByLandUse(landStats: any): Record<string, number> {
    const complianceByLandUse = {};
    
    for (const landUse of Object.keys(landStats.parcelsByLandUse)) {
      // Mock compliance rates by land use type
      complianceByLandUse[landUse] = Math.random() * 20 + 80; // 80-100% compliance
    }

    return complianceByLandUse;
  }

  private generateMockTrend(days: number, min: number, max: number): number[] {
    const trend = [];
    for (let i = 0; i < days; i++) {
      trend.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return trend;
  }

  private generateInsights(trends: any): string[] {
    const insights = [];

    // Analyze trends and generate insights
    const landTrend = trends.landRegistrations;
    const userTrend = trends.userGrowth;
    const governanceTrend = trends.governanceParticipation;

    if (landTrend[landTrend.length - 1] > landTrend[0]) {
      insights.push('Land registrations are trending upward');
    }

    if (userTrend[userTrend.length - 1] > userTrend[0]) {
      insights.push('User growth is accelerating');
    }

    if (governanceTrend[governanceTrend.length - 1] > governanceTrend[0]) {
      insights.push('Governance participation is increasing');
    }

    return insights;
  }

  private generatePredictions(trends: any): Record<string, number> {
    // Simple linear prediction for next period
    const predictions = {};

    for (const [key, values] of Object.entries(trends)) {
      const trend = values as number[];
      const recent = trend.slice(-7); // Last 7 days
      const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      predictions[key] = Math.round(average);
    }

    return predictions;
  }
}
