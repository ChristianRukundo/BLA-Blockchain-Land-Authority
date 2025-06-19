import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { ContractService } from './services/contract.service';
import { TransactionService } from './services/transaction.service';
import { EventListenerService } from './services/event-listener.service';

@Module({
  imports: [ConfigModule],
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    ContractService,
    TransactionService,
    EventListenerService,
  ],
  exports: [
    BlockchainService,
    ContractService,
    TransactionService,
    EventListenerService,
  ],
})
export class BlockchainModule {}
