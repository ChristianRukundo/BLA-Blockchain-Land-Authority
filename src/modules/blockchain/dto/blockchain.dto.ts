import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class ContractCallDto {
  @ApiProperty({ description: 'Contract address' })
  @IsString()
  contractAddress: string;

  @ApiProperty({ description: 'Contract ABI', type: 'array' })
  @IsArray()
  abi: any[];

  @ApiProperty({ description: 'Method name to call' })
  @IsString()
  methodName: string;

  @ApiProperty({ description: 'Method parameters', required: false, type: 'array' })
  @IsArray()
  @IsOptional()
  params?: any[];
}

export class TransactionDto extends ContractCallDto {
  @ApiProperty({ description: 'Value to send with transaction (in ETH)', required: false })
  @IsString()
  @IsOptional()
  value?: string;
}

export class EventSubscriptionDto {
  @ApiProperty({ description: 'Contract address' })
  @IsString()
  contractAddress: string;

  @ApiProperty({ description: 'Contract ABI', type: 'array' })
  @IsArray()
  abi: any[];

  @ApiProperty({ description: 'Event name to subscribe to' })
  @IsString()
  eventName: string;
}

export class BlockchainStatusDto {
  @ApiProperty({ description: 'Current block number' })
  @IsNumber()
  blockNumber: number;

  @ApiProperty({ description: 'Current gas price in ETH' })
  @IsString()
  gasPrice: string;

  @ApiProperty({ description: 'Signer address' })
  @IsString()
  signerAddress: string;

  @ApiProperty({ description: 'Signer balance in ETH' })
  @IsString()
  signerBalance: string;

  @ApiProperty({ description: 'Connection status' })
  @IsBoolean()
  connected: boolean;
}

export class BalanceDto {
  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Balance in ETH' })
  @IsString()
  balance: string;
}

export class TransactionReceiptDto {
  @ApiProperty({ description: 'Transaction hash' })
  @IsString()
  transactionHash: string;

  @ApiProperty({ description: 'Block number' })
  @IsNumber()
  blockNumber: number;

  @ApiProperty({ description: 'Block hash' })
  @IsString()
  blockHash: string;

  @ApiProperty({ description: 'Gas used' })
  @IsString()
  gasUsed: string;

  @ApiProperty({ description: 'Transaction status (1 = success, 0 = failure)' })
  @IsNumber()
  status: number;

  @ApiProperty({ description: 'From address' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'To address' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Contract address (if contract creation)', required: false })
  @IsString()
  @IsOptional()
  contractAddress?: string;

  @ApiProperty({ description: 'Transaction logs', type: 'array' })
  @IsArray()
  logs: any[];
}
