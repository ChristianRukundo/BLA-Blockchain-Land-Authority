import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InheritanceController } from './inheritance.controller';
import { InheritanceService } from './inheritance.service';
import { Inheritance } from './entities/inheritance.entity';
import { InheritanceRequest } from './entities/inheritance-request.entity';
import { IpfsModule } from '../ipfs/ipfs.module';
import { NotificationModule } from '../notification/notification.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { LaisModule } from '../lais/lais.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inheritance, InheritanceRequest]),
    IpfsModule,
    NotificationModule,
    BlockchainModule,
    LaisModule,
  ],
  controllers: [InheritanceController],
  providers: [InheritanceService],
  exports: [InheritanceService],
})
export class InheritanceModule {}
