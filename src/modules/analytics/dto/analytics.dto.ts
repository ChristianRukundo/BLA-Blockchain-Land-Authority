import { ApiProperty } from '@nestjs/swagger';

export class SystemOverviewDto {
  @ApiProperty()
  totalLandParcels: number;

  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeGovernanceProposals: number;

  @ApiProperty()
  pendingInheritanceRequests: number;

  @ApiProperty()
  activeExpropriations: number;

  @ApiProperty()
  openDisputes: number;

  @ApiProperty()
  pendingAdminActions: number;

  @ApiProperty()
  systemHealth: number;

  @ApiProperty()
  lastUpdated: Date;
}

export class LandManagementAnalyticsDto {
  @ApiProperty()
  totalParcels: number;

  @ApiProperty()
  totalArea: number;

  @ApiProperty()
  averageParcelSize: number;

  @ApiProperty()
  parcelsByLandUse: Record<string, number>;

  @ApiProperty()
  utilizationByType: Record<string, any>;

  @ApiProperty()
  geographicDistribution: any;

  @ApiProperty()
  cadastralDataQuality: any;

  @ApiProperty()
  complianceOverview: Record<string, number>;

  @ApiProperty()
  expropriationOverview: Record<string, number>;
}

export class GovernanceAnalyticsDto {
  @ApiProperty()
  totalProposals: number;

  @ApiProperty()
  activeProposals: number;

  @ApiProperty()
  proposalsByStatus: Record<string, number>;

  @ApiProperty()
  proposalsByType: Record<string, number>;

  @ApiProperty()
  totalVoters: number;

  @ApiProperty()
  totalVotingPower: number;

  @ApiProperty()
  averageParticipation: number;

  @ApiProperty()
  participationTrends: any;

  @ApiProperty()
  proposalSuccessRate: number;

  @ApiProperty()
  recentProposals: number;
}

export class UserAnalyticsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  usersByStatus: Record<string, number>;

  @ApiProperty()
  usersByKYCStatus: Record<string, number>;

  @ApiProperty()
  verifiedUsers: number;

  @ApiProperty()
  verificationRate: number;

  @ApiProperty()
  activityMetrics: any;

  @ApiProperty()
  growthTrends: any;

  @ApiProperty()
  recentRegistrations: number;
}

export class TransactionAnalyticsDto {
  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  transactionVolume: any;

  @ApiProperty()
  transactionsByType: Record<string, number>;

  @ApiProperty()
  averageTransactionTime: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  gasUsageMetrics: any;
}

export class ComplianceAnalyticsDto {
  @ApiProperty()
  overallComplianceRate: number;

  @ApiProperty()
  complianceByLandUse: Record<string, number>;

  @ApiProperty()
  violationTrends: any;

  @ApiProperty()
  complianceReports: number;

  @ApiProperty()
  reportsByStatus: Record<string, number>;

  @ApiProperty()
  reportsByType: Record<string, number>;

  @ApiProperty()
  averageResolutionTime: number;

  @ApiProperty()
  recentActivity: number;
}

export class PerformanceMetricsDto {
  @ApiProperty()
  systemUptime: number;

  @ApiProperty()
  averageResponseTime: number;

  @ApiProperty()
  throughput: any;

  @ApiProperty()
  resourceUtilization: any;

  @ApiProperty()
  databaseMetrics: any;

  @ApiProperty()
  blockchainMetrics: any;
}

export class TrendAnalysisDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  trends: Record<string, number[]>;

  @ApiProperty()
  insights: string[];

  @ApiProperty()
  predictions: Record<string, number>;
}
