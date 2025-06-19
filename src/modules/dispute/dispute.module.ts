import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { Dispute, DisputeEvidence } from './entities/dispute.entity';
import { IpfsModule } from '../ipfs/ipfs.module';
import { NotificationModule } from '../notification/notification.module';
import { LaisModule } from '../lais/lais.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, DisputeEvidence]),
    IpfsModule,
    NotificationModule,
    LaisModule,
  ],
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}

