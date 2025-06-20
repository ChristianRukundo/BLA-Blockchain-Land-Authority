import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ethers,
  JsonRpcProvider,
  Wallet,
  TransactionResponse,
  EventLog,
  ContractTransactionResponse, // For transactions from contract methods
  TransactionRequest, // For estimateGas
  InterfaceAbi, // For ABI type
} from 'ethers';
import { ContractService } from './services/contract.service';
import { VoteChoice } from '../governance/entities/proposal.entity';

// Parameter types for blockchain interactions
export interface CreateOnChainProposalParams {
  targets: string[];
  values: string[];
  calldatas: string[];
  description: string;
}

export interface OnChainProposalResult {
  onChainProposalId: string;
  transactionHash: string;
  blockNumber: number;
  voteStart?: bigint;
  voteEnd?: bigint;
}

export interface CancelOnChainProposalParams {
  targets: string[];
  values: string[];
  calldatas: string[];
  descriptionHash: string;
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: JsonRpcProvider;
  private signer: Wallet;

  constructor(
    private readonly configService: ConfigService,
    private readonly contractService: ContractService,
  ) {}

  async onModuleInit() {
    try {
      await this.initializeProvider();
      await this.initializeSigner();
      await this.contractService.initializeContracts(this.provider, this.signer);
      this.logger.log('BlockchainService initialized, ContractService also initialized.');
    } catch (error) {
      this.logger.error('Failed during BlockchainService onModuleInit', (error as Error).stack);
      throw error;
    }
  }

  private async initializeProvider() {
    const rpcUrl = this.configService.get<string>('ARBITRUM_RPC_URL');
    if (!rpcUrl) throw new Error('ARBITRUM_RPC_URL is not configured');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await this.provider.getNetwork();
    this.logger.log(
      `Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`,
    );
  }

  private async initializeSigner() {
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    if (!privateKey) throw new Error('PRIVATE_KEY for signer is not configured');
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.logger.log(`Signer initialized with address: ${this.signer.address}`);
  }

  // --- Provider and Signer Accessors ---
  getProvider(): JsonRpcProvider {
    return this.provider;
  }
  getSigner(): Wallet {
    return this.signer;
  }

  // --- Basic Blockchain Info Methods ---
  async getBlockNumber(): Promise<number> {
    return Number(await this.provider.getBlockNumber());
  }

  async getBalance(address: string): Promise<string> {
    // Exposed for controller
    if (!ethers.isAddress(address)) throw new Error('Invalid address provided for getBalance.');
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getGasPrice(): Promise<string> {
    // Exposed for controller
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0'; // Return as Gwei string
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  async waitForTransaction(
    txHash: string,
    confirmations = 1,
  ): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash, confirmations);
  }

  async estimateGas(transaction: TransactionRequest): Promise<string> {
    // Exposed for controller
    const gasEstimate = await this.provider.estimateGas(transaction);
    return gasEstimate.toString();
  }

  // --- Address and Unit Utilities ---
  isAddress(address: string): boolean {
    // Exposed for controller
    return ethers.isAddress(address);
  }

  getAddress(address: string): string {
    // Exposed for controller (checksummed address)
    return ethers.getAddress(address);
  }

  parseEther(value: string): string {
    // Returns string for consistency if controller exposes it
    return ethers.parseEther(value).toString();
  }

  formatEther(value: string | bigint): string {
    // Accepts string or bigint
    return ethers.formatEther(BigInt(value));
  }

  parseUnits(value: string, decimals: number | string): string {
    // Returns string
    return ethers.parseUnits(value, decimals).toString();
  }

  formatUnits(value: string | bigint, decimals: number | string): string {
    // Exposed for controller
    return ethers.formatUnits(BigInt(value), decimals);
  }

  // --- Generic Contract Interaction Methods (Exposed for Controller) ---
  async callContract(
    contractAddress: string,
    abi: InterfaceAbi, // Use InterfaceAbi from ethers
    methodName: string,
    params: any[] = [],
  ): Promise<any> {
    this.logger.debug(
      `Generic callContract: ${contractAddress}.${methodName}(${params.join(', ')})`,
    );
    if (!ethers.isAddress(contractAddress))
      throw new Error('Invalid contract address for callContract.');
    // This uses the generic Contract instance with the provider (for read-only)
    // If the contract is already initialized in ContractService, it might be better to use that
    // This implementation is for calling ANY contract with provided ABI.
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    try {
      return await contract[methodName](...params);
    } catch (error) {
      this.logger.error(
        `Error in generic callContract ${contractAddress}.${methodName}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendTransaction(
    // This is a generic send, not using ContractService's typed contracts by default
    contractAddress: string,
    abi: InterfaceAbi,
    methodName: string,
    params: any[] = [],
    value?: string, // ETH value as string
  ): Promise<TransactionResponse> {
    this.logger.debug(
      `Generic sendTransaction: ${contractAddress}.${methodName}(${params.join(', ')}) with value ${value || '0'}`,
    );
    if (!ethers.isAddress(contractAddress))
      throw new Error('Invalid contract address for sendTransaction.');
    const contract = new ethers.Contract(contractAddress, abi, this.signer); // Use signer
    try {
      const txValue = value ? ethers.parseEther(value) : 0n;
      const tx: TransactionResponse = await contract[methodName](...params, { value: txValue });
      this.logger.log(`Generic transaction sent: ${tx.hash}`);
      return tx;
    } catch (error) {
      this.logger.error(
        `Error in generic sendTransaction ${contractAddress}.${methodName}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // --- Event Subscription (Conceptual - Real subscription is complex for HTTP) ---
  // For a controller, direct event subscription is tricky due to HTTP's request-response nature.
  // Typically, events are handled by a persistent listener service.
  // These methods are more for a backend service that maintains connections.
  // Exposing them via controller might imply a polling mechanism or websockets.

  async subscribeToEvents(
    // Placeholder if controller needs to trigger setup
    contractAlias: string, // Using alias from ContractService
    eventName: string,
    // callback: (event: EventLog) => void, // Callback won't work directly via HTTP controller
  ): Promise<string> {
    // Returns a message
    this.logger.log(
      `Request to subscribe to ${eventName} on ${contractAlias}. Note: Actual listening is usually persistent.`,
    );
    // In a real scenario, this might register interest with a persistent EventListenerService.
    // await this.eventListenerService.subscribeToEvents(contractAddress, abi, eventName, callback);
    return `Subscription request for ${eventName} on ${contractAlias} noted. Check persistent event listeners for data.`;
  }

  async unsubscribeFromEvents(
    // Placeholder
    contractAlias: string,
    eventName: string,
  ): Promise<string> {
    this.logger.log(`Request to unsubscribe from ${eventName} on ${contractAlias}.`);
    // await this.eventListenerService.unsubscribeFromEvents(contractAddress, eventName);
    return `Unsubscription request for ${eventName} on ${contractAlias} noted.`;
  }

  // --- Specific Governance and Token Methods (as before) ---
  async createProposal(params: CreateOnChainProposalParams): Promise<OnChainProposalResult> {
    this.logger.log(`Attempting to create on-chain proposal: "${params.description}"`);
    const governanceContract = this.contractService.getGovernanceContract();
    const valuesBigInt = params.values.map(v => BigInt(v));
    const txResponse = await governanceContract.propose(
      params.targets,
      valuesBigInt,
      params.calldatas,
      params.description,
    );
    this.logger.log(`On-chain proposal transaction sent. Hash: ${txResponse.hash}`);
    const receipt = await txResponse.wait(1);
    if (!receipt) throw new Error(`Transaction receipt not found for ${txResponse.hash}`);

    let onChainProposalId = '';
    let voteStart: bigint | undefined;
    let voteEnd: bigint | undefined;
    const proposalCreatedEvent = receipt.logs?.find(
      log => (log as EventLog).eventName === 'ProposalCreated',
    ) as EventLog | undefined;

    if (proposalCreatedEvent?.args) {
      onChainProposalId = proposalCreatedEvent.args.proposalId.toString();
      voteStart = proposalCreatedEvent.args.voteStart;
      voteEnd = proposalCreatedEvent.args.voteEnd;
      this.logger.log(
        `ProposalCreated event: ID ${onChainProposalId}, Start ${voteStart}, End ${voteEnd}`,
      );
    } else {
      this.logger.error(
        `ProposalCreated event not found or args missing for tx ${txResponse.hash}`,
      );
      throw new Error('Could not extract onChainProposalId from ProposalCreated event.');
    }
    return {
      onChainProposalId,
      transactionHash: receipt.hash,
      blockNumber: Number(receipt.blockNumber),
      voteStart,
      voteEnd,
    };
  }

  async voteOnProposal(
    onChainProposalId: string,
    choice: VoteChoice,
    reason?: string,
  ): Promise<TransactionResponse> {
    this.logger.log(`Voting on on-chain proposal ${onChainProposalId}, choice ${choice}`);
    const governanceContract = this.contractService.getGovernanceContract();
    let supportValue: number;
    switch (choice) {
      case VoteChoice.FOR:
        supportValue = 1;
        break;
      case VoteChoice.AGAINST:
        supportValue = 0;
        break;
      case VoteChoice.ABSTAIN:
        supportValue = 2;
        break;
      default:
        throw new Error(`Invalid vote choice: ${choice}`);
    }
    const tx = await governanceContract.castVoteWithReason(
      onChainProposalId,
      supportValue,
      reason || '',
    );
    this.logger.log(`Vote tx sent for proposal ${onChainProposalId}: ${tx.hash}`);
    return tx;
  }

  async queueProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string,
  ): Promise<TransactionResponse> {
    this.logger.log(`Queuing on-chain proposal (descHash: ${descriptionHash})`);
    const governanceContract = this.contractService.getGovernanceContract();
    const tx = await governanceContract.queue(
      targets,
      values.map(v => BigInt(v)),
      calldatas,
      descriptionHash,
    );
    this.logger.log(`Queue tx sent (descHash: ${descriptionHash}): ${tx.hash}`);
    return tx;
  }

  async executeProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string,
  ): Promise<TransactionResponse> {
    this.logger.log(`Executing on-chain proposal (descHash: ${descriptionHash})`);
    const governanceContract = this.contractService.getGovernanceContract();
    const tx = await governanceContract.execute(
      targets,
      values.map(v => BigInt(v)),
      calldatas,
      descriptionHash,
    );
    this.logger.log(`Execute tx sent (descHash: ${descriptionHash}): ${tx.hash}`);
    return tx;
  }

  async cancelProposal(params: CancelOnChainProposalParams): Promise<TransactionResponse> {
    this.logger.log(`Cancelling on-chain proposal (descHash: ${params.descriptionHash})`);
    const governanceContract = this.contractService.getGovernanceContract();
    const tx = await governanceContract.cancel(
      params.targets,
      params.values.map(v => BigInt(v)),
      params.calldatas,
      params.descriptionHash,
    );
    this.logger.log(`Cancel tx sent (descHash: ${params.descriptionHash}): ${tx.hash}`);
    return tx;
  }

  async getVotingPowerAtSnapshot(
    address: string,
    blockNumber?: number | string | bigint,
  ): Promise<string> {
    this.logger.debug(
      `Fetching voting power for ${address} at block ${blockNumber?.toString() || 'latest'}`,
    );
    const tokenContract = this.contractService.getErc20VotesTokenContract();
    let power: bigint;
    if (blockNumber !== undefined && blockNumber !== null && String(blockNumber).trim() !== '') {
      try {
        power = await tokenContract.getPastVotes(address, BigInt(blockNumber));
      } catch (e) {
        this.logger.warn(
          `Failed to getPastVotes for ${address} at block ${blockNumber}: ${(e as Error).message}. Falling back to current votes.`,
        );
        power = await tokenContract.getVotes(address); // Fallback or rethrow
      }
    } else {
      power = await tokenContract.getVotes(address);
    }
    return power.toString();
  }

  /**
   * Fetches the total supply of the governance token at a specific block.
   * Useful for calculating quorum percentages or total possible votes at proposal creation.
   */
  async getPastTotalSupplyAtSnapshot(blockNumber: string | bigint): Promise<string> {
    this.logger.debug(`Fetching past total supply at block ${blockNumber.toString()}`);
    try {
      const tokenContract = this.contractService.getErc20VotesTokenContract();
      const pastTotalSupply = await tokenContract.getPastTotalSupply(BigInt(blockNumber));
      return pastTotalSupply.toString();
    } catch (error) {
      this.logger.error(
        `Failed to get past total supply at block ${blockNumber}: ${(error as Error).message}`,
      );
      throw new Error(`Could not fetch past total supply: ${(error as Error).message}`);
    }
  }

  /**
   * Calls the cancelInheritanceRequest method on the InheritanceLogic smart contract.
   * This is typically called to cancel an inheritance request before it is executed.
   * @param requestId The ID of the inheritance request to cancel (bytes32).
   * @returns The transaction response from the blockchain.
   */
  async cancelInheritanceRequest(requestId: string): Promise<TransactionResponse> {
    const inheritanceContract = this.contractService.getInheritanceContract();
    return inheritanceContract.cancelInheritanceRequest(requestId as `0x${string}`);
  }

    /**
   * Calls the executeInheritance method on the InheritanceLogic smart contract.
   * This is typically called after death verification is complete.
   * @param onChainRequestId The bytes32 request ID obtained from the initiateInheritance transaction event.
   * @returns The transaction response from the blockchain.
   */
  async executeInheritanceRequest(onChainRequestId: string /* bytes32 as string '0x...' */): Promise<TransactionResponse> {
    this.logger.log(`Attempting to execute on-chain inheritance for request ID: ${onChainRequestId}`);
    try {
      const inheritanceContract = this.contractService.getInheritanceContract(); // Typed: InheritanceLogic
      // Your InheritanceLogic.sol has: executeInheritance(bytes32 requestId)
      const tx: TransactionResponse = await inheritanceContract.executeInheritance(onChainRequestId as `0x${string}`); // Cast to bytes32 hex string
      this.logger.log(`On-chain executeInheritance transaction sent for request ${onChainRequestId}. Hash: ${tx.hash}`);
      return tx;
    } catch (error) {
      this.logger.error(`Failed to execute on-chain inheritance for request ${onChainRequestId}: ${(error as Error).message}`, (error as Error).stack);
      throw error; // Rethrow to be handled by the calling service (InheritanceService)
    }
  }

  /**
   * Calls the initiateInheritance method on the InheritanceLogic smart contract.
   * This starts the process, which may involve an oracle for death verification.
   * @param tokenId The land parcel's token ID (uint256).
   * @param evidenceHash IPFS hash of the death certificate or other evidence.
   * @returns The transaction response from the blockchain.
   */
  async initiateInheritance(tokenId: string /* uint256 as string */, evidenceHash: string): Promise<TransactionResponse> {
    this.logger.log(`Attempting to initiate on-chain inheritance for parcel (token ID): ${tokenId} with evidence: ${evidenceHash}`);
    try {
      const inheritanceContract = this.contractService.getInheritanceContract(); // Typed: InheritanceLogic
      // Your InheritanceLogic.sol has: initiateInheritance(uint256 tokenId, string memory evidenceHash)
      const tx: TransactionResponse = await inheritanceContract.initiateInheritance(BigInt(tokenId), evidenceHash);
      this.logger.log(`On-chain initiateInheritance transaction sent for parcel ${tokenId}. Hash: ${tx.hash}`);
      return tx;
    } catch (error) {
      this.logger.error(`Failed to initiate on-chain inheritance for parcel ${tokenId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Calls the cancelInheritanceRequest method on the InheritanceLogic smart contract.
   * @param onChainRequestId The bytes32 request ID to cancel.
   * @returns The transaction response.
   */
  async cancelInheritanceRequestBlockchain(onChainRequestId: string /* bytes32 as string '0x...' */): Promise<TransactionResponse> {
    this.logger.log(`Attempting to cancel on-chain inheritance request ID: ${onChainRequestId}`);
    try {
      const inheritanceContract = this.contractService.getInheritanceContract(); // Typed
      // Your InheritanceLogic.sol has: cancelInheritanceRequest(bytes32 requestId)
      const tx: TransactionResponse = await inheritanceContract.cancelInheritanceRequest(onChainRequestId as `0x${string}`);
      this.logger.log(`On-chain cancelInheritanceRequest transaction sent for request ${onChainRequestId}. Hash: ${tx.hash}`);
      return tx;
    } catch(error) {
      this.logger.error(`Failed to cancel on-chain inheritance request ${onChainRequestId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  // Placeholder for setting heir directly on LandParcelNFT if needed
  async setHeirOnLandParcel(tokenId: string /* uint256 */, heirAddress: string): Promise<TransactionResponse> {
      const landParcelContract = this.contractService.getLandParcelNFTContract(); // Typed
      this.logger.log(`Setting heir ${heirAddress} for land parcel token ID ${tokenId} on-chain.`);
      // Your LandParcelNFT.sol has: function setDesignatedHeir(uint256 tokenId, address heir)
      return landParcelContract.setDesignatedHeir(BigInt(tokenId), heirAddress);
  }
}
