import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEthereumAddress,
  ValidateNested,
  Min,
  IsObject,
  IsNotEmpty,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterfaceAbi } from 'ethers';

export class CallContractRequestDto {
  @ApiProperty({ description: 'Target contract address', example: '0x...' })
  @IsEthereumAddress()
  contractAddress: string;

  @ApiProperty({
    description: 'Contract ABI',
    type: 'array',
    example: [
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ],
  })
  @IsArray()
  abi: InterfaceAbi;

  @ApiProperty({ description: 'Method name to call', example: 'balanceOf' })
  @IsString()
  @IsNotEmpty()
  methodName: string;

  @ApiPropertyOptional({ description: 'Method parameters', type: 'array', example: ['0x...'] })
  @IsArray()
  @IsOptional()
  params?: any[];
}

export class SendTransactionRequestDto extends CallContractRequestDto {
  @ApiPropertyOptional({
    description: 'Value to send with transaction (in ETH as string)',
    example: '0.1',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Gas limit (as string)', example: '100000' })
  @IsOptional()
  @IsNumberString()
  gasLimit?: string;

  @ApiPropertyOptional({
    description: 'Gas price for legacy transactions (in GWEI as string)',
    example: '20',
  })
  @IsOptional()
  @IsNumberString()
  gasPrice?: string;

  @ApiPropertyOptional({
    description: 'Max priority fee per gas (EIP-1559) (in GWEI as string)',
    example: '2',
  })
  @IsOptional()
  @IsNumberString()
  maxPriorityFeePerGas?: string;

  @ApiPropertyOptional({
    description: 'Max fee per gas (EIP-1559) (in GWEI as string)',
    example: '50',
  })
  @IsOptional()
  @IsNumberString()
  maxFeePerGas?: string;
}

export class EventSubscriptionRequestDto {
  @ApiProperty({ description: 'Contract alias or address' })
  @IsString()
  @IsNotEmpty()
  contractIdentifier: string;

  @ApiPropertyOptional({ description: 'Contract ABI if identifier is an address', type: 'array' })
  @IsOptional()
  @IsArray()
  abi?: InterfaceAbi;

  @ApiProperty({ description: 'Event name' })
  @IsString()
  @IsNotEmpty()
  eventName: string;
}

export class EstimateGasRequestDto {
  @ApiPropertyOptional({ description: 'Sender address' })
  @IsOptional()
  @IsEthereumAddress()
  from?: string;

  @ApiPropertyOptional({ description: 'Recipient address' })
  @IsOptional()
  @IsEthereumAddress()
  to?: string;

  @ApiPropertyOptional({ description: 'Nonce' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nonce?: number;

  @ApiPropertyOptional({ description: 'Gas limit (string)' })
  @IsOptional()
  @IsNumberString()
  gasLimit?: string;

  @ApiPropertyOptional({ description: 'Gas price (GWEI string)' })
  @IsOptional()
  @IsNumberString()
  gasPrice?: string;

  @ApiPropertyOptional({ description: 'Transaction data (hex string)', example: '0x...' })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({ description: 'Value to send (ETH string)' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Chain ID' })
  @IsOptional()
  @IsNumberString()
  chainId?: string;

  @ApiPropertyOptional({ description: 'Max priority fee per gas (GWEI string)' })
  @IsOptional()
  @IsNumberString()
  maxPriorityFeePerGas?: string;

  @ApiPropertyOptional({ description: 'Max fee per gas (GWEI string)' })
  @IsOptional()
  @IsNumberString()
  maxFeePerGas?: string;
}

export class BlockchainStatusDto {
  @ApiProperty({ description: 'Current block number', example: 12345678 })
  @IsNumber()
  blockNumber: number;
  @ApiProperty({ description: 'Current gas price in GWEI', example: '25.5' })
  @IsString()
  gasPriceGwei: string;
  @ApiProperty({ description: 'Backend signer address', example: '0x...' })
  @IsEthereumAddress()
  signerAddress: string;
  @ApiProperty({ description: 'Backend signer ETH balance', example: '100.0' })
  @IsString()
  signerBalanceEth: string;
  @ApiProperty({ description: 'Provider connection status' })
  @IsBoolean()
  connected: boolean;
}

export class BalanceResponseDto {
  @ApiProperty({ description: 'Queried address', example: '0x...' })
  @IsEthereumAddress()
  address: string;
  @ApiProperty({ description: 'Balance in ETH', example: '10.5' })
  @IsString()
  balanceEth: string;
}

export class LogDto {
  @ApiProperty() @IsNumber() index: number;
  @ApiProperty() @IsNumber() blockNumber: number;
  @ApiProperty() @IsString() blockHash: string;
  @ApiProperty() @IsString() transactionHash: string;
  @ApiProperty() @IsNumber() transactionIndex: number;
  @ApiProperty() @IsEthereumAddress() address: string;
  @ApiProperty() @IsString() data: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) topics: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() args?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsString() eventName?: string;
}

export class TransactionReceiptResponseDto {
  @ApiProperty() @IsString() hash: string;
  @ApiProperty() @IsNumber() blockNumber: number;
  @ApiProperty() @IsString() blockHash: string;
  @ApiProperty() @IsString() gasUsed: string;
  @ApiProperty() @IsString() cumulativeGasUsed: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gasPrice?: string;
  @ApiProperty() @IsNumber() status: number;
  @ApiProperty() @IsEthereumAddress() from: string;
  @ApiPropertyOptional() @IsOptional() @IsEthereumAddress() to?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEthereumAddress() contractAddress?: string | null;
  @ApiProperty({ type: [LogDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogDto)
  logs: LogDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() logsBloom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() root?: string;
  @ApiProperty() @IsNumber() type: number;
}

export class BlockResponseDto {
  @ApiProperty() @IsNumber() blockNumber: number;
}

export class GasPriceResponseDto {
  @ApiProperty() @IsString() gasPriceGwei: string;
}

export class AddressValidationResponseDto {
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsBoolean() isValid: boolean;
  @ApiPropertyOptional() @IsOptional() @IsEthereumAddress() checksummedAddress?: string | null;
}

export class TransactionSentResponseDto {
  @ApiProperty() @IsString() hash: string;
  @ApiProperty() @IsEthereumAddress() from: string;
  @ApiPropertyOptional() @IsOptional() @IsEthereumAddress() to?: string;
  @ApiProperty() @IsNumber() nonce: number;
  @ApiProperty() @IsString() chainId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gasPrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gasLimit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() value?: string;
}

export class EstimateGasResponseDto {
  @ApiProperty() @IsString() estimatedGas: string;
}

export class FormatUnitsResponseDto {
  @ApiProperty() @IsString() formattedValue: string;
}

export class ParseUnitsResponseDto {
  @ApiProperty() @IsString() parsedValue: string;
}

export class EventSubscriptionResponseDto {
  @ApiProperty() @IsString() message: string;
}
