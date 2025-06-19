import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ContractService } from './services/contract.service';
import { TransactionService } from './services/transaction.service';
import { EventListenerService } from './services/event-listener.service';
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  constructor(
    private readonly configService: ConfigService,
    private readonly contractService: ContractService,
    private readonly transactionService: TransactionService,
    private readonly eventListenerService: EventListenerService,
  ) {}
  async onModuleInit() {
    await this.initializeProvider();
    await this.initializeSigner();
    await this.contractService.initializeContracts(this.provider, this.signer);
    await this.eventListenerService.startListening();
    this.logger.log('Blockchain service initialized successfully');
  }
  private async initializeProvider() {
    const rpcUrl = this.configService.get<string>('ARBITRUM_RPC_URL');
    if (!rpcUrl) {
      throw new Error('ARBITRUM_RPC_URL is not configured');
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test connection
    try {
      const network = await this.provider.getNetwork();
      this.logger.log(`Connected to network: ${network.name} (${network.chainId})`);
    } catch (error) {
      this.logger.error('Failed to connect to blockchain network', error);
      throw error;
    }
  }
  private async initializeSigner() {
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('PRIVATE_KEY is not configured');
    }
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.logger.log(`Signer initialized: ${this.signer.address}`);
  }
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
  getSigner(): ethers.Wallet {
    return this.signer;
  }
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }
  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }
  async waitForTransaction(txHash: string, confirmations = 1): Promise<ethers.TransactionReceipt> {
    return await this.provider.waitForTransaction(txHash, confirmations);
  }
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    return await this.provider.estimateGas(transaction);
  }
  async getGasPrice(): Promise<bigint> {
    return await this.provider.getFeeData().then(data => data.gasPrice || 0n);
  }
  async getNonce(address: string): Promise<number> {
    return await this.provider.getTransactionCount(address);
  }
  // Contract interaction methods
  async callContract(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
  ): Promise<any> {
    return await this.contractService.callContract(contractAddress, abi, methodName, params);
  }
  async sendTransaction(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
    value?: bigint,
  ): Promise<ethers.TransactionResponse> {
    return await this.transactionService.sendTransaction(
      contractAddress,
      abi,
      methodName,
      params,
      value,
    );
  }
  // Event listening methods
  async subscribeToEvents(
    contractAddress: string,
    abi: any[],
    eventName: string,
    callback: (event: any) => void,
  ): Promise<void> {
    await this.eventListenerService.subscribeToEvents(contractAddress, abi, eventName, callback);
  }
  async unsubscribeFromEvents(contractAddress: string, eventName: string): Promise<void> {
    await this.eventListenerService.unsubscribeFromEvents(contractAddress, eventName);
  }
  // Utility methods
  parseEther(value: string): bigint {
    return ethers.parseEther(value);
  }
  formatEther(value: bigint): string {
    return ethers.formatEther(value);
  }
  parseUnits(value: string, decimals: number): bigint {
    return ethers.parseUnits(value, decimals);
  }
  formatUnits(value: bigint, decimals: number): string {
    return ethers.formatUnits(value, decimals);
  }
  isAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
  getAddress(address: string): string {
    return ethers.getAddress(address);
  }
}
