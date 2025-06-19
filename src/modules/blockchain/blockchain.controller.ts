import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import {
  ContractCallDto,
  TransactionDto,
  EventSubscriptionDto,
  BlockchainStatusDto,
  TransactionReceiptDto,
  BalanceDto,
} from './dto/blockchain.dto';

@ApiTags('blockchain')
@Controller('blockchain')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get blockchain network status' })
  @ApiResponse({ status: 200, description: 'Blockchain status retrieved successfully', type: BlockchainStatusDto })
  async getStatus(): Promise<BlockchainStatusDto> {
    try {
      const blockNumber = await this.blockchainService.getBlockNumber();
      const gasPrice = await this.blockchainService.getGasPrice();
      const signerAddress = this.blockchainService.getSigner().address;
      const signerBalance = await this.blockchainService.getBalance(signerAddress);

      return {
        blockNumber,
        gasPrice: this.blockchainService.formatEther(gasPrice),
        signerAddress,
        signerBalance,
        connected: true,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get blockchain status: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get balance for an address' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully', type: BalanceDto })
  async getBalance(@Param('address') address: string): Promise<BalanceDto> {
    try {
      if (!this.blockchainService.isAddress(address)) {
        throw new HttpException('Invalid address format', HttpStatus.BAD_REQUEST);
      }

      const balance = await this.blockchainService.getBalance(address);
      return {
        address: this.blockchainService.getAddress(address),
        balance,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get balance: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('transaction/:hash')
  @ApiOperation({ summary: 'Get transaction receipt' })
  @ApiResponse({ status: 200, description: 'Transaction receipt retrieved successfully', type: TransactionReceiptDto })
  async getTransactionReceipt(@Param('hash') hash: string): Promise<TransactionReceiptDto> {
    try {
      const receipt = await this.blockchainService.getTransactionReceipt(hash);
      
      if (!receipt) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress,
        logs: receipt.logs,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get transaction receipt: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('contract/call')
  @ApiOperation({ summary: 'Call a contract method (read-only)' })
  @ApiResponse({ status: 200, description: 'Contract method called successfully' })
  async callContract(@Body() contractCallDto: ContractCallDto): Promise<any> {
    try {
      const { contractAddress, abi, methodName, params } = contractCallDto;
      
      if (!this.blockchainService.isAddress(contractAddress)) {
        throw new HttpException('Invalid contract address format', HttpStatus.BAD_REQUEST);
      }

      const result = await this.blockchainService.callContract(
        contractAddress,
        abi,
        methodName,
        params || [],
      );

      return {
        result,
        contractAddress,
        methodName,
        params: params || [],
      };
    } catch (error) {
      throw new HttpException(
        `Failed to call contract method: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('transaction/send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Send a transaction to a contract method' })
  @ApiResponse({ status: 200, description: 'Transaction sent successfully' })
  async sendTransaction(@Body() transactionDto: TransactionDto): Promise<any> {
    try {
      const { contractAddress, abi, methodName, params, value } = transactionDto;
      
      if (!this.blockchainService.isAddress(contractAddress)) {
        throw new HttpException('Invalid contract address format', HttpStatus.BAD_REQUEST);
      }

      const valueInWei = value ? this.blockchainService.parseEther(value) : undefined;
      
      const tx = await this.blockchainService.sendTransaction(
        contractAddress,
        abi,
        methodName,
        params || [],
        valueInWei,
      );

      return {
        transactionHash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        nonce: tx.nonce,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to send transaction: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('events/subscribe')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Subscribe to contract events' })
  @ApiResponse({ status: 200, description: 'Event subscription created successfully' })
  async subscribeToEvents(@Body() eventSubscriptionDto: EventSubscriptionDto): Promise<any> {
    try {
      const { contractAddress, abi, eventName } = eventSubscriptionDto;
      
      if (!this.blockchainService.isAddress(contractAddress)) {
        throw new HttpException('Invalid contract address format', HttpStatus.BAD_REQUEST);
      }

      // For now, we'll just acknowledge the subscription
      // In a real implementation, you might want to store subscription details
      // and handle the callback through WebSockets or Server-Sent Events
      await this.blockchainService.subscribeToEvents(
        contractAddress,
        abi,
        eventName,
        (event) => {
          // Handle event - could emit to WebSocket clients, store in database, etc.
          console.log('Event received:', event);
        },
      );

      return {
        message: 'Event subscription created successfully',
        contractAddress,
        eventName,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to subscribe to events: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('events/unsubscribe')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Unsubscribe from contract events' })
  @ApiResponse({ status: 200, description: 'Event subscription removed successfully' })
  async unsubscribeFromEvents(
    @Body() body: { contractAddress: string; eventName: string },
  ): Promise<any> {
    try {
      const { contractAddress, eventName } = body;
      
      if (!this.blockchainService.isAddress(contractAddress)) {
        throw new HttpException('Invalid contract address format', HttpStatus.BAD_REQUEST);
      }

      await this.blockchainService.unsubscribeFromEvents(contractAddress, eventName);

      return {
        message: 'Event subscription removed successfully',
        contractAddress,
        eventName,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to unsubscribe from events: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('gas-price')
  @ApiOperation({ summary: 'Get current gas price' })
  @ApiResponse({ status: 200, description: 'Gas price retrieved successfully' })
  async getGasPrice(): Promise<{ gasPrice: string; gasPriceGwei: string }> {
    try {
      const gasPrice = await this.blockchainService.getGasPrice();
      return {
        gasPrice: gasPrice.toString(),
        gasPriceGwei: this.blockchainService.formatUnits(gasPrice, 9), // Convert to Gwei
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get gas price: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('estimate-gas')
  @ApiOperation({ summary: 'Estimate gas for a transaction' })
  @ApiResponse({ status: 200, description: 'Gas estimation completed successfully' })
  async estimateGas(@Body() transactionDto: TransactionDto): Promise<{ estimatedGas: string }> {
    try {
      const { contractAddress, abi, methodName, params, value } = transactionDto;
      
      if (!this.blockchainService.isAddress(contractAddress)) {
        throw new HttpException('Invalid contract address format', HttpStatus.BAD_REQUEST);
      }

      // Create a transaction request for gas estimation
      const contract = new (require('ethers')).Contract(
        contractAddress,
        abi,
        this.blockchainService.getProvider(),
      );

      const valueInWei = value ? this.blockchainService.parseEther(value) : undefined;
      const populatedTx = await contract.populateTransaction[methodName](...(params || []), {
        value: valueInWei,
      });

      const estimatedGas = await this.blockchainService.estimateGas(populatedTx);

      return {
        estimatedGas: estimatedGas.toString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to estimate gas: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
