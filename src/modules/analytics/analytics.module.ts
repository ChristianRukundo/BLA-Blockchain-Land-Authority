import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LaisModule } from '../lais/lais.module';
import { GovernanceModule } from '../governance/governance.module';
import { InheritanceModule } from '../inheritance/inheritance.module';
import { ExpropriationModule } from '../expropriation/expropriation.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { DisputeModule } from '../dispute/dispute.module';
import { AdminModule } from '../admin/admin.module';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    LaisModule,
    GovernanceModule,
    InheritanceModule,
    ExpropriationModule,
    ComplianceModule,
    DisputeModule,
    AdminModule,
    UserProfileModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
