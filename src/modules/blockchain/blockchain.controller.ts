import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards, // Added if you use JwtAuthGuard
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
// Corrected DTO imports based on the DTO file provided in the previous response
import {
  BlockchainStatusDto,
  BalanceResponseDto,
  TransactionReceiptResponseDto,
  AddressValidationResponseDto,
  CallContractRequestDto,      // Renamed from CallContractDto
  SendTransactionRequestDto,   // Renamed from SendTransactionDto
  EventSubscriptionRequestDto, // Renamed from EventSubscriptionDto
  EstimateGasRequestDto,
  EstimateGasResponseDto,
  BlockResponseDto,            // Renamed from BlockDto
  GasPriceResponseDto,         // Renamed from GasPriceDto
  TransactionSentResponseDto,  // Renamed from TransactionResponseDto
  FormatUnitsResponseDto,
  ParseUnitsResponseDto,
  EventSubscriptionResponseDto // Response for event subscription actions
} from './dto/blockchain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // If protecting these endpoints
import { EventLog } from 'ethers';

@ApiTags('blockchain-utils')
@Controller('blockchain-utils')
// @UseGuards(JwtAuthGuard) // Optional: Uncomment to protect all utility endpoints
// @ApiBearerAuth()         // Optional: If JwtAuthGuard is used
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('status') // New endpoint for general status
  @ApiOperation({ summary: 'Get blockchain service status (block, gas, signer info)' })
  @ApiResponse({ status: 200, description: 'Blockchain service status', type: BlockchainStatusDto })
  async getServiceStatus(): Promise<BlockchainStatusDto> {
    this.logger.log('Request to get blockchain service status');
    try {
        const blockNumber = await this.blockchainService.getBlockNumber();
        const gasPriceGwei = await this.blockchainService.getGasPrice();
        const signer = this.blockchainService.getSigner(); // Assuming this returns a Wallet
        const signerAddress = signer.address;
        const signerBalanceEth = await this.blockchainService.getBalance(signerAddress);
        const connected = !!(await this.blockchainService.getProvider().getNetwork()); // Basic connection check

        return { blockNumber, gasPriceGwei, signerAddress, signerBalanceEth, connected };
    } catch (error) {
        this.logger.error(`Error getting service status: ${(error as Error).message}`);
        throw new HttpException('Failed to get service status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get('block/current')
  @ApiOperation({ summary: 'Get the current block number' })
  @ApiResponse({ status: 200, description: 'Current block number', type: BlockResponseDto })
  async getCurrentBlock(): Promise<BlockResponseDto> {
    this.logger.log('Request to get current block number');
    try {
      const blockNumber = await this.blockchainService.getBlockNumber();
      return { blockNumber };
    } catch (error) {
      this.logger.error(`Error getting current block: ${(error as Error).message}`);
      throw new HttpException('Failed to get current block', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('gas-price')
  @ApiOperation({ summary: 'Get the current gas price' })
  @ApiResponse({ status: 200, description: 'Current gas price in GWEI', type: GasPriceResponseDto })
  async getGasPriceController(): Promise<GasPriceResponseDto> { // Renamed method to avoid conflict if class has same name
    this.logger.log('Request to get gas price');
    const gasPrice = await this.blockchainService.getGasPrice();
    return { gasPriceGwei: gasPrice };
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get ETH balance of an address' })
  @ApiResponse({ status: 200, description: 'ETH Balance', type: BalanceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid address format' })
  @ApiParam({ name: 'address', description: 'Ethereum address', type: String })
  async getAddressBalance(@Param('address') address: string): Promise<BalanceResponseDto> { // Renamed method
    this.logger.log(`Request to get balance for address: ${address}`);
    if (!this.blockchainService.isAddress(address)) {
        throw new HttpException('Invalid Ethereum address format', HttpStatus.BAD_REQUEST);
    }
    const balance = await this.blockchainService.getBalance(address);
    return { address, balanceEth: balance };
  }

  @Get('is-address/:address')
  @ApiOperation({ summary: 'Validate if a string is a valid Ethereum address' })
  @ApiResponse({ status: 200, description: 'Address validation result', type: AddressValidationResponseDto })
  @ApiParam({ name: 'address', description: 'String to validate as Ethereum address', type: String })
  async validateAddress(@Param('address') address: string): Promise<AddressValidationResponseDto> {
    this.logger.log(`Request to validate address: ${address}`);
    const isValid = this.blockchainService.isAddress(address);
    let checksummedAddress: string | null = null;
    if (isValid) {
        checksummedAddress = this.blockchainService.getAddress(address);
    }
    return { address, isValid, checksummedAddress };
  }


  @Get('transaction-receipt/:txHash')
  @ApiOperation({ summary: 'Get the receipt of a transaction' })
  @ApiResponse({ status: 200, description: 'Transaction receipt', type: TransactionReceiptResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not found or not mined yet' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash', type: String })
  async getTransactionReceiptController(@Param('txHash') txHash: string): Promise<TransactionReceiptResponseDto> { // Renamed
    this.logger.log(`Request to get transaction receipt for: ${txHash}`);
    const receipt = await this.blockchainService.getTransactionReceipt(txHash);
    if (!receipt) {
        throw new HttpException('Transaction receipt not found.', HttpStatus.NOT_FOUND);
    }
    // Manual mapping to handle BigInts and structure
    return {
        hash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString(),
        status: receipt.status === null ? -1 : Number(receipt.status), // -1 for pending, or handle null
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress,
        logs: (receipt.logs as unknown as EventLog[]).map(log => ({ // Cast log to EventLog
            index: log.index,
            blockNumber: Number(log.blockNumber),
            blockHash: log.blockHash,
            transactionHash: log.transactionHash,
            transactionIndex: Number(log.transactionIndex),
            address: log.address,
            data: log.data,
            topics: log.topics as string[], // topics are already string[]
            // args: log.args ? { ...log.args } : undefined, // Spread args to plain object
            // eventName: log.eventName
        })),
        logsBloom: receipt.logsBloom,
        root: receipt.root,
        type: Number(receipt.type),
    };
  }

  @Post('contract/call')
  @ApiOperation({ summary: 'Call a read-only method on a smart contract' })
  @ApiResponse({ status: 200, description: 'Result of the contract call' })
  @ApiResponse({ status: 400, description: 'Invalid input or contract call failed' })
  @ApiBody({ type: CallContractRequestDto })
  async callContractController(@Body() callRequestDto: CallContractRequestDto): Promise<any> { // Renamed DTO
    this.logger.log(`Request to call contract ${callRequestDto.contractAddress} method ${callRequestDto.methodName}`);
    if (!this.blockchainService.isAddress(callRequestDto.contractAddress)) {
        throw new HttpException('Invalid contract address', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.blockchainService.callContract(
        callRequestDto.contractAddress,
        callRequestDto.abi,
        callRequestDto.methodName,
        callRequestDto.params,
      );
    } catch (error) {
      this.logger.error(`Error calling contract: ${(error as Error).message}`);
      throw new HttpException(`Contract call failed: ${(error as Error).message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('contract/send-transaction')
  @ApiOperation({ summary: 'Send a transaction to a smart contract method (writes state)' })
  @ApiResponse({ status: 200, description: 'Transaction response (details of sent tx)', type: TransactionSentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or transaction failed' })
  @ApiBody({ type: SendTransactionRequestDto })
  async sendTransactionController(@Body() sendTxRequestDto: SendTransactionRequestDto): Promise<TransactionSentResponseDto> { // Renamed DTO
    this.logger.log(`Request to send transaction to ${sendTxRequestDto.contractAddress} method ${sendTxRequestDto.methodName}`);
     if (!this.blockchainService.isAddress(sendTxRequestDto.contractAddress)) {
        throw new HttpException('Invalid contract address', HttpStatus.BAD_REQUEST);
    }
    try {
      const txResponse = await this.blockchainService.sendTransaction(
        sendTxRequestDto.contractAddress,
        sendTxRequestDto.abi,
        sendTxRequestDto.methodName,
        sendTxRequestDto.params,
        sendTxRequestDto.value,
      );
      return {
          hash: txResponse.hash,
          from: txResponse.from,
          to: txResponse.to || undefined, // to can be null for contract creation
          nonce: Number(txResponse.nonce),
          chainId: txResponse.chainId.toString(),
          gasPrice: txResponse.gasPrice?.toString(),
          gasLimit: txResponse.gasLimit.toString(),
          value: txResponse.value.toString(),
      };
    } catch (error) {
      this.logger.error(`Error sending transaction: ${(error as Error).message}`);
      throw new HttpException(`Transaction failed: ${(error as Error).message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('contract/subscribe-events')
  @ApiOperation({ summary: 'Request subscription to smart contract events (conceptual for HTTP)' })
  @ApiResponse({ status: 200, description: 'Subscription request status', type: EventSubscriptionResponseDto })
  @ApiBody({ type: EventSubscriptionRequestDto })
  async subscribeToEventsController(@Body() eventSubRequestDto: EventSubscriptionRequestDto): Promise<EventSubscriptionResponseDto> { // Renamed DTO
    this.logger.log(`Request to subscribe to event ${eventSubRequestDto.eventName} on contract ID ${eventSubRequestDto.contractIdentifier}`);
    // If contractIdentifier is an address, you might need to validate it and pass ABI
    const message = await this.blockchainService.subscribeToEvents(
      eventSubRequestDto.contractIdentifier, // Pass identifier (alias or address)
      eventSubRequestDto.eventName,
    );
    return { message };
  }

  @Post('contract/unsubscribe-events')
  @ApiOperation({ summary: 'Request unsubscription from smart contract events (conceptual for HTTP)' })
  @ApiResponse({ status: 200, description: 'Unsubscription request status', type: EventSubscriptionResponseDto })
  @ApiBody({ type: EventSubscriptionRequestDto })
  async unsubscribeFromEventsController(@Body() eventSubRequestDto: EventSubscriptionRequestDto): Promise<EventSubscriptionResponseDto> { // Renamed DTO
    this.logger.log(`Request to unsubscribe from event ${eventSubRequestDto.eventName} on contract ID ${eventSubRequestDto.contractIdentifier}`);
    const message = await this.blockchainService.unsubscribeFromEvents(
      eventSubRequestDto.contractIdentifier,
      eventSubRequestDto.eventName,
    );
    return { message };
  }

  @Post('utils/format-units')
  @ApiOperation({ summary: 'Format a BigInt value from a smaller unit to a larger unit (e.g., wei to ether)' })
  @ApiResponse({ status: 200, description: 'Formatted value as string', type: FormatUnitsResponseDto })
  @ApiBody({ schema: { type: 'object', properties: { value: { type: 'string', description: "The value in smallest unit (e.g., wei)" }, decimals: { type: 'number', default: 18, description: "Number of decimals (e.g., 18 for ETH)" } } } })
  formatUnitsController(@Body('value') value: string, @Body('decimals') decimals: number | string = 18): FormatUnitsResponseDto {
    this.logger.log(`Request to format units for value: ${value}, decimals: ${decimals}`);
    try {
        const formattedValue = this.blockchainService.formatUnits(value, decimals);
        return { formattedValue };
    } catch (error) {
        this.logger.error(`Error formatting units: ${(error as Error).message}`);
        throw new HttpException(`Failed to format units: ${(error as Error).message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('utils/parse-units')
  @ApiOperation({ summary: 'Parse a string decimal to a BigInt value in a smaller unit (e.g., ether to wei)' })
  @ApiResponse({ status: 200, description: 'Parsed value as string (BigInt)', type: ParseUnitsResponseDto })
  @ApiBody({ schema: { type: 'object', properties: { value: { type: 'string', description: "The value in larger unit (e.g., ETH)" }, decimals: { type: 'number', default: 18, description: "Number of decimals (e.g., 18 for ETH)" } } } })
  parseUnitsController(@Body('value') value: string, @Body('decimals') decimals: number | string = 18): ParseUnitsResponseDto {
    this.logger.log(`Request to parse units for value: ${value}, decimals: ${decimals}`);
    try {
        const parsedValue = this.blockchainService.parseUnits(value, decimals);
        return { parsedValue };
    } catch (error) {
        this.logger.error(`Error parsing units: ${(error as Error).message}`);
        throw new HttpException(`Failed to parse units: ${(error as Error).message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('gas/estimate')
  @ApiOperation({ summary: 'Estimate gas for a transaction' })
  @ApiResponse({ status: 200, description: 'Estimated gas amount', type: EstimateGasResponseDto })
  @ApiBody({ type: EstimateGasRequestDto })
  async estimateGasController(@Body() estimateGasReqDto: EstimateGasRequestDto): Promise<EstimateGasResponseDto> { // Renamed DTO
    this.logger.log(`Request to estimate gas for transaction to: ${estimateGasReqDto.to || 'contract deployment'}`);
    if (estimateGasReqDto.to && !this.blockchainService.isAddress(estimateGasReqDto.to)) {
        throw new HttpException('Invalid "to" address for gas estimation', HttpStatus.BAD_REQUEST);
    }
    try {
        // Construct TransactionRequest carefully in the service or here
        // For simplicity, assuming estimateGasRequestDto fields map directly to ethers.TransactionRequest
        const estimatedGas = await this.blockchainService.estimateGas(estimateGasReqDto as any); // Cast if DTO structure matches TransactionRequest
        return { estimatedGas };
    } catch (error) {
        this.logger.error(`Error estimating gas: ${(error as Error).message}`);
        throw new HttpException(`Failed to estimate gas: ${(error as Error).message}`, HttpStatus.BAD_REQUEST);
    }
  }
}