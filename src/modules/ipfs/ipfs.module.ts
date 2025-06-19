import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IpfsController } from './ipfs.controller';
import { IpfsService } from './ipfs.service';

@Module({
  imports: [ConfigModule],
  controllers: [IpfsController],
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IpfsModule {}

