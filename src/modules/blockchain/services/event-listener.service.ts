import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

interface EventSubscription {
  contract: ethers.Contract;
  eventName: string;
  callback: (event: any) => void;
  filter: ethers.EventFilter;
}

@Injectable()
export class EventListenerService implements OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private isListening = false;

  constructor(private readonly configService: ConfigService) {}

  async startListening(): Promise<void> {
    if (this.isListening) {
      this.logger.warn('Event listener is already running');
      return;
    }

    this.isListening = true;
    this.logger.log('Event listener service started');

    // Set up core contract event listeners
    await this.setupCoreEventListeners();
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    // Remove all event listeners
    for (const [key, subscription] of this.subscriptions) {
      try {
        subscription.contract.removeAllListeners(subscription.eventName);
        this.logger.debug(`Removed listener for ${key}`);
      } catch (error) {
        this.logger.error(`Failed to remove listener for ${key}`, error);
      }
    }

    this.subscriptions.clear();
    this.isListening = false;
    this.logger.log('Event listener service stopped');
  }

  onModuleDestroy() {
    this.stopListening();
  }

  setProvider(provider: ethers.providers.JsonRpcProvider): void {
    this.provider = provider;
  }

  async subscribeToEvents(
    contractAddress: string,
    abi: any[],
    eventName: string,
    callback: (event: any) => void,
  ): Promise<void> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const filter = contract.filters[eventName]();
      
      const subscriptionKey = `${contractAddress}-${eventName}`;
      
      // Remove existing subscription if it exists
      if (this.subscriptions.has(subscriptionKey)) {
        await this.unsubscribeFromEvents(contractAddress, eventName);
      }

      // Set up the event listener
      contract.on(filter, (...args) => {
        const event = args[args.length - 1]; // Last argument is the event object
        const parsedEvent = {
          address: event.address,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          event: eventName,
          args: args.slice(0, -1), // All arguments except the last one
          raw: event,
        };

        this.logger.debug(`Event received: ${eventName}`, {
          contractAddress,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        });

        callback(parsedEvent);
      });

      // Store the subscription
      this.subscriptions.set(subscriptionKey, {
        contract,
        eventName,
        callback,
        filter,
      });

      this.logger.log(`Subscribed to event: ${eventName} on contract ${contractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to event: ${eventName}`, error);
      throw error;
    }
  }

  async unsubscribeFromEvents(contractAddress: string, eventName: string): Promise<void> {
    const subscriptionKey = `${contractAddress}-${eventName}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription) {
      this.logger.warn(`No subscription found for ${subscriptionKey}`);
      return;
    }

    try {
      subscription.contract.removeAllListeners(eventName);
      this.subscriptions.delete(subscriptionKey);
      this.logger.log(`Unsubscribed from event: ${eventName} on contract ${contractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from event: ${eventName}`, error);
      throw error;
    }
  }

  private async setupCoreEventListeners(): Promise<void> {
    try {
      // Land Parcel NFT Events
      const landParcelAddress = this.configService.get<string>('LAND_PARCEL_NFT_ADDRESS');
      if (landParcelAddress) {
        await this.setupLandParcelEventListeners(landParcelAddress);
      }

      // Inheritance Logic Events
      const inheritanceAddress = this.configService.get<string>('INHERITANCE_LOGIC_ADDRESS');
      if (inheritanceAddress) {
        await this.setupInheritanceEventListeners(inheritanceAddress);
      }

      // Expropriation Events
      const expropriationAddress = this.configService.get<string>('EXPROPRIATION_COMPENSATION_MANAGER_ADDRESS');
      if (expropriationAddress) {
        await this.setupExpropriationEventListeners(expropriationAddress);
      }

      // Compliance Events
      const complianceAddress = this.configService.get<string>('COMPLIANCE_RULE_ENGINE_ADDRESS');
      if (complianceAddress) {
        await this.setupComplianceEventListeners(complianceAddress);
      }

      // Dispute Events
      const disputeAddress = this.configService.get<string>('DISPUTE_RESOLUTION_ADDRESS');
      if (disputeAddress) {
        await this.setupDisputeEventListeners(disputeAddress);
      }

      this.logger.log('Core event listeners set up successfully');
    } catch (error) {
      this.logger.error('Failed to set up core event listeners', error);
    }
  }

  private async setupLandParcelEventListeners(contractAddress: string): Promise<void> {
    const abi = [
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
      'event HeirDesignated(uint256 indexed tokenId, address indexed heir)',
      'event ParcelMinted(uint256 indexed tokenId, address indexed owner, string tokenURI)',
    ];

    // Transfer events
    await this.subscribeToEvents(contractAddress, abi, 'Transfer', (event) => {
      this.handleLandParcelTransfer(event);
    });

    // Heir designation events
    await this.subscribeToEvents(contractAddress, abi, 'HeirDesignated', (event) => {
      this.handleHeirDesignation(event);
    });

    // Parcel minted events
    await this.subscribeToEvents(contractAddress, abi, 'ParcelMinted', (event) => {
      this.handleParcelMinted(event);
    });
  }

  private async setupInheritanceEventListeners(contractAddress: string): Promise<void> {
    const abi = [
      'event InheritanceRequested(uint256 indexed tokenId, bytes32 indexed requestId)',
      'event InheritanceExecuted(uint256 indexed tokenId, address indexed newOwner)',
      'event InheritanceRejected(uint256 indexed tokenId, bytes32 indexed requestId, string reason)',
    ];

    await this.subscribeToEvents(contractAddress, abi, 'InheritanceRequested', (event) => {
      this.handleInheritanceRequested(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'InheritanceExecuted', (event) => {
      this.handleInheritanceExecuted(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'InheritanceRejected', (event) => {
      this.handleInheritanceRejected(event);
    });
  }

  private async setupExpropriationEventListeners(contractAddress: string): Promise<void> {
    const abi = [
      'event ParcelFlagged(uint256 indexed tokenId, uint256 compensation)',
      'event CompensationDeposited(uint256 indexed tokenId, uint256 amount)',
      'event CompensationClaimed(uint256 indexed tokenId, address indexed owner)',
    ];

    await this.subscribeToEvents(contractAddress, abi, 'ParcelFlagged', (event) => {
      this.handleParcelFlagged(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'CompensationDeposited', (event) => {
      this.handleCompensationDeposited(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'CompensationClaimed', (event) => {
      this.handleCompensationClaimed(event);
    });
  }

  private async setupComplianceEventListeners(contractAddress: string): Promise<void> {
    const abi = [
      'event ComplianceAssessed(uint256 indexed tokenId, uint8 status)',
      'event FineIssued(uint256 indexed tokenId, uint256 amount)',
      'event IncentiveAwarded(uint256 indexed tokenId, uint256 amount)',
    ];

    await this.subscribeToEvents(contractAddress, abi, 'ComplianceAssessed', (event) => {
      this.handleComplianceAssessed(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'FineIssued', (event) => {
      this.handleFineIssued(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'IncentiveAwarded', (event) => {
      this.handleIncentiveAwarded(event);
    });
  }

  private async setupDisputeEventListeners(contractAddress: string): Promise<void> {
    const abi = [
      'event DisputeCreated(uint256 indexed disputeId, uint256 indexed tokenId)',
      'event EvidenceSubmitted(uint256 indexed disputeId, string evidence)',
      'event RulingExecuted(uint256 indexed disputeId, uint256 ruling)',
    ];

    await this.subscribeToEvents(contractAddress, abi, 'DisputeCreated', (event) => {
      this.handleDisputeCreated(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'EvidenceSubmitted', (event) => {
      this.handleEvidenceSubmitted(event);
    });

    await this.subscribeToEvents(contractAddress, abi, 'RulingExecuted', (event) => {
      this.handleRulingExecuted(event);
    });
  }

  // Event handlers
  private handleLandParcelTransfer(event: any): void {
    this.logger.log('Land parcel transferred', {
      tokenId: event.args[2]?.toString(),
      from: event.args[0],
      to: event.args[1],
      transactionHash: event.transactionHash,
    });

    // Here you could emit to WebSocket clients, update database, send notifications, etc.
    // For example: this.notificationService.sendTransferNotification(event);
  }

  private handleHeirDesignation(event: any): void {
    this.logger.log('Heir designated', {
      tokenId: event.args[0]?.toString(),
      heir: event.args[1],
      transactionHash: event.transactionHash,
    });
  }

  private handleParcelMinted(event: any): void {
    this.logger.log('Parcel minted', {
      tokenId: event.args[0]?.toString(),
      owner: event.args[1],
      tokenURI: event.args[2],
      transactionHash: event.transactionHash,
    });
  }

  private handleInheritanceRequested(event: any): void {
    this.logger.log('Inheritance requested', {
      tokenId: event.args[0]?.toString(),
      requestId: event.args[1],
      transactionHash: event.transactionHash,
    });
  }

  private handleInheritanceExecuted(event: any): void {
    this.logger.log('Inheritance executed', {
      tokenId: event.args[0]?.toString(),
      newOwner: event.args[1],
      transactionHash: event.transactionHash,
    });
  }

  private handleInheritanceRejected(event: any): void {
    this.logger.log('Inheritance rejected', {
      tokenId: event.args[0]?.toString(),
      requestId: event.args[1],
      reason: event.args[2],
      transactionHash: event.transactionHash,
    });
  }

  private handleParcelFlagged(event: any): void {
    this.logger.log('Parcel flagged for expropriation', {
      tokenId: event.args[0]?.toString(),
      compensation: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleCompensationDeposited(event: any): void {
    this.logger.log('Compensation deposited', {
      tokenId: event.args[0]?.toString(),
      amount: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleCompensationClaimed(event: any): void {
    this.logger.log('Compensation claimed', {
      tokenId: event.args[0]?.toString(),
      owner: event.args[1],
      transactionHash: event.transactionHash,
    });
  }

  private handleComplianceAssessed(event: any): void {
    this.logger.log('Compliance assessed', {
      tokenId: event.args[0]?.toString(),
      status: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleFineIssued(event: any): void {
    this.logger.log('Fine issued', {
      tokenId: event.args[0]?.toString(),
      amount: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleIncentiveAwarded(event: any): void {
    this.logger.log('Incentive awarded', {
      tokenId: event.args[0]?.toString(),
      amount: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleDisputeCreated(event: any): void {
    this.logger.log('Dispute created', {
      disputeId: event.args[0]?.toString(),
      tokenId: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  private handleEvidenceSubmitted(event: any): void {
    this.logger.log('Evidence submitted', {
      disputeId: event.args[0]?.toString(),
      evidence: event.args[1],
      transactionHash: event.transactionHash,
    });
  }

  private handleRulingExecuted(event: any): void {
    this.logger.log('Ruling executed', {
      disputeId: event.args[0]?.toString(),
      ruling: event.args[1]?.toString(),
      transactionHash: event.transactionHash,
    });
  }

  // Utility methods
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  isEventListenerActive(): boolean {
    return this.isListening;
  }
}
