import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  TransactionResponse,
  TransactionReceipt,
  BigNumberish
} from 'ethers';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private provider: JsonRpcProvider;
  private signer: Wallet;

  constructor(private readonly configService: ConfigService) {}

  setSigner(signer: Wallet): void {
    this.signer = signer;
  }

  setProvider(provider: JsonRpcProvider): void {
    this.provider = provider;
  }

  async sendTransaction(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
    value?: BigNumberish,
  ): Promise<TransactionResponse> {
    try {
      const contract = new Contract(contractAddress, abi, this.signer);

      const gasEstimate = await contract.estimateGas[methodName](...params, {
        value: value || 0,
      });

      const gasLimit = gasEstimate.mul(120).div(100);

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) {
        throw new Error('Unable to fetch gas price from provider');
      }

      const tx = await contract[methodName](...params, {
        value: value || 0,
        gasLimit,
        gasPrice,
      });

      this.logger.log(`Transaction sent: ${tx.hash}`, {
        contractAddress,
        methodName,
        params,
        value: value?.toString(),
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
      });

      return tx;
    } catch (error) {
      this.logger.error(`Transaction failed: ${contractAddress}.${methodName}`, {
        params,
        value: value?.toString(),
        error: (error as any).message,
      });
      throw error;
    }
  }

  async sendRawTransaction(
    to: string,
    data: string,
    value?: BigNumberish,
    gasLimit?: BigNumberish,
  ): Promise<TransactionResponse> {
    try {
      const nonce = await this.provider.getTransactionCount(this.signer.address);
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) {
        throw new Error('Unable to fetch gas price from provider');
      }

      const transaction = {
        to,
        data,
        value: value || 0,
        gasLimit: gasLimit || 21000,
        gasPrice,
        nonce,
      };

      const tx = await this.signer.sendTransaction(transaction);

      this.logger.log(`Raw transaction sent: ${tx.hash}`, {
        to,
        value: value?.toString(),
        gasLimit: gasLimit?.toString(),
        gasPrice: gasPrice.toString(),
        nonce,
      });

      return tx;
    } catch (error) {
      this.logger.error('Raw transaction failed', {
        to,
        value: value?.toString(),
        error: (error as any).message,
      });
      throw error;
    }
  }

  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000,
  ): Promise<TransactionReceipt> {
    try {
      this.logger.log(`Waiting for transaction confirmation: ${txHash}`, {
        confirmations,
        timeout,
      });

      const receipt = await this.provider.waitForTransaction(txHash, confirmations, timeout);

      if (receipt.status === 0) {
        throw new Error(`Transaction failed: ${txHash}`);
      }

      this.logger.log(`Transaction confirmed: ${txHash}`, {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      });

      return receipt;
    } catch (error) {
      this.logger.error(`Transaction confirmation failed: ${txHash}`, error);
      throw error;
    }
  }

  async batchTransactions(
    transactions: Array<{
      contractAddress: string;
      abi: any[];
      methodName: string;
      params: any[];
      value?: BigNumberish;
    }>,
  ): Promise<TransactionResponse[]> {
    const results: TransactionResponse[] = [];

    for (const tx of transactions) {
      try {
        const result = await this.sendTransaction(
          tx.contractAddress,
          tx.abi,
          tx.methodName,
          tx.params,
          tx.value,
        );
        results.push(result);

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error('Batch transaction failed', {
          transaction: tx,
          error: (error as any).message,
        });
        throw error;
      }
    }

    this.logger.log(`Batch transactions completed: ${results.length} transactions sent`);
    return results;
  }

  async estimateTransactionCost(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
    value?: BigNumberish,
  ): Promise<{
    gasEstimate: BigNumberish;
    gasPrice: BigNumberish;
    estimatedCost: BigNumberish;
  }> {
    try {
      const contract = new Contract(contractAddress, abi, this.provider);

      const gasEstimate = await contract.estimateGas[methodName](...params, {
        value: value || 0,
      });

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) {
        throw new Error('Unable to fetch gas price from provider');
      }
      const estimatedCost = gasEstimate.mul(gasPrice);

      return {
        gasEstimate,
        gasPrice,
        estimatedCost,
      };
    } catch (error) {
      this.logger.error('Gas estimation failed', {
        contractAddress,
        methodName,
        params,
        error: (error as any).message,
      });
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    receipt?: TransactionReceipt;
    confirmations?: number;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { status: 'pending' };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        receipt,
        confirmations,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction status: ${txHash}`, error);
      throw error;
    }
  }

  async cancelTransaction(
    originalTxHash: string,
    gasPrice?: BigNumberish,
  ): Promise<TransactionResponse> {
    try {
      const originalTx = await this.provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      const receipt = await this.provider.getTransactionReceipt(originalTxHash);
      if (receipt) {
        throw new Error('Transaction already mined, cannot cancel');
      }

      const newGasPrice = gasPrice || originalTx.gasPrice?.mul(110).div(100);

      const cancelTx = await this.signer.sendTransaction({
        to: this.signer.address,
        value: 0,
        gasLimit: 21000,
        gasPrice: newGasPrice,
        nonce: originalTx.nonce,
      });

      this.logger.log(`Cancel transaction sent: ${cancelTx.hash}`, {
        originalTxHash,
        newGasPrice: newGasPrice?.toString(),
        nonce: originalTx.nonce,
      });

      return cancelTx;
    } catch (error) {
      this.logger.error(`Failed to cancel transaction: ${originalTxHash}`, error);
      throw error;
    }
  }

  async speedUpTransaction(
    originalTxHash: string,
    gasPrice?: BigNumberish,
  ): Promise<TransactionResponse> {
    try {
      const originalTx = await this.provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      const receipt = await this.provider.getTransactionReceipt(originalTxHash);
      if (receipt) {
        throw new Error('Transaction already mined, cannot speed up');
      }

      const newGasPrice = gasPrice || originalTx.gasPrice?.mul(110).div(100);

      const speedUpTx = await this.signer.sendTransaction({
        to: originalTx.to,
        value: originalTx.value,
        data: originalTx.data,
        gasLimit: originalTx.gasLimit,
        gasPrice: newGasPrice,
        nonce: originalTx.nonce,
      });

      this.logger.log(`Speed up transaction sent: ${speedUpTx.hash}`, {
        originalTxHash,
        newGasPrice: newGasPrice?.toString(),
        nonce: originalTx.nonce,
      });

      return speedUpTx;
    } catch (error) {
      this.logger.error(`Failed to speed up transaction: ${originalTxHash}`, error);
      throw error;
    }
  }
}
