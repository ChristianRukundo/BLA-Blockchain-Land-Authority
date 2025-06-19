import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor(private readonly configService: ConfigService) {}

  setSigner(signer: ethers.Wallet): void {
    this.signer = signer;
  }

  setProvider(provider: ethers.providers.JsonRpcProvider): void {
    this.provider = provider;
  }

  async sendTransaction(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = [],
    value?: ethers.BigNumber,
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.signer);
      
      // Estimate gas for the transaction
      const gasEstimate = await contract.estimateGas[methodName](...params, {
        value: value || 0,
      });

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();

      // Send the transaction
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
        error: error.message,
      });
      throw error;
    }
  }

  async sendRawTransaction(
    to: string,
    data: string,
    value?: ethers.BigNumber,
    gasLimit?: ethers.BigNumber,
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      const nonce = await this.provider.getTransactionCount(this.signer.address);
      const gasPrice = await this.provider.getGasPrice();

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
        error: error.message,
      });
      throw error;
    }
  }

  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000, // 5 minutes
  ): Promise<ethers.providers.TransactionReceipt> {
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
      value?: ethers.BigNumber;
    }>,
  ): Promise<ethers.providers.TransactionResponse[]> {
    const results: ethers.providers.TransactionResponse[] = [];

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

        // Wait a bit between transactions to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error('Batch transaction failed', {
          transaction: tx,
          error: error.message,
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
    value?: ethers.BigNumber,
  ): Promise<{
    gasEstimate: ethers.BigNumber;
    gasPrice: ethers.BigNumber;
    estimatedCost: ethers.BigNumber;
  }> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      
      const gasEstimate = await contract.estimateGas[methodName](...params, {
        value: value || 0,
      });

      const gasPrice = await this.provider.getGasPrice();
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
        error: error.message,
      });
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    receipt?: ethers.providers.TransactionReceipt;
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
    gasPrice?: ethers.BigNumber,
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      // Get the original transaction
      const originalTx = await this.provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      // Check if transaction is already mined
      const receipt = await this.provider.getTransactionReceipt(originalTxHash);
      if (receipt) {
        throw new Error('Transaction already mined, cannot cancel');
      }

      // Send a replacement transaction with higher gas price and same nonce
      const newGasPrice = gasPrice || originalTx.gasPrice?.mul(110).div(100); // 10% higher
      
      const cancelTx = await this.signer.sendTransaction({
        to: this.signer.address, // Send to self
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
    gasPrice?: ethers.BigNumber,
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      // Get the original transaction
      const originalTx = await this.provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      // Check if transaction is already mined
      const receipt = await this.provider.getTransactionReceipt(originalTxHash);
      if (receipt) {
        throw new Error('Transaction already mined, cannot speed up');
      }

      // Send a replacement transaction with higher gas price
      const newGasPrice = gasPrice || originalTx.gasPrice?.mul(110).div(100); // 10% higher
      
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
