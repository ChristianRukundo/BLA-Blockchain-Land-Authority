import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpropriationController } from './expropriation.controller';
import { ExpropriationService } from './expropriation.service';
import { Expropriation } from './entities/expropriation.entity';
import { LaisModule } from '../lais/lais.module';
import { IpfsModule } from '../ipfs/ipfs.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expropriation]),
    LaisModule,
    IpfsModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [ExpropriationController],
  providers: [ExpropriationService],
  exports: [ExpropriationService],
})
export class ExpropriationModule {}

