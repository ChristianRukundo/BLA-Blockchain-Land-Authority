import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, JsonRpcProvider, Wallet, Contract as EthersContract, Interface } from 'ethers';

import {
  RwaGovernor,
  RwaGovernor__factory,
  RwaLandGovToken,
  RwaLandGovToken__factory,
  RwaTimelockController,
  RwaTimelockController__factory,
  LandParcelNFT,
  LandParcelNFT__factory,
  InheritanceLogic,
  InheritanceLogic__factory,
  ExpropriationCompensationManager,
  ExpropriationCompensationManager__factory,
  ComplianceRuleEngine,
  ComplianceRuleEngine__factory,
  DisputeResolution,
  DisputeResolution__factory,
  MockRWF,
  MockRWF__factory,
  EcoCredits,
  EcoCredits__factory,
} from '../../../types/contracts';

interface ContractConfig {
  addressKey: string;
  factory: any;
  contractAlias: string;
}

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private provider: JsonRpcProvider;
  private signer: Wallet;
  private contracts: Map<string, EthersContract> = new Map();

  private readonly contractConfigurations: ContractConfig[] = [
    {
      addressKey: 'LAND_PARCEL_NFT_ADDRESS',
      factory: LandParcelNFT__factory,
      contractAlias: 'LandParcelNFT',
    },
    {
      addressKey: 'INHERITANCE_LOGIC_ADDRESS',
      factory: InheritanceLogic__factory,
      contractAlias: 'InheritanceLogic',
    },
    {
      addressKey: 'EXPROPRIATION_COMPENSATION_MANAGER_ADDRESS',
      factory: ExpropriationCompensationManager__factory,
      contractAlias: 'ExpropriationCompensationManager',
    },
    {
      addressKey: 'COMPLIANCE_RULE_ENGINE_ADDRESS',
      factory: ComplianceRuleEngine__factory,
      contractAlias: 'ComplianceRuleEngine',
    },
    {
      addressKey: 'DISPUTE_RESOLUTION_ADDRESS',
      factory: DisputeResolution__factory,
      contractAlias: 'DisputeResolution',
    },
    {
      addressKey: 'GOVERNANCE_CONTRACT_ADDRESS',
      factory: RwaGovernor__factory,
      contractAlias: 'RwaGovernor',
    },
    {
      addressKey: 'RWA_LAND_GOV_TOKEN_ADDRESS',
      factory: RwaLandGovToken__factory,
      contractAlias: 'RwaLandGovToken',
    },
    {
      addressKey: 'TIMELOCK_CONTROLLER_ADDRESS',
      factory: RwaTimelockController__factory,
      contractAlias: 'RwaTimelockController',
    },
    { addressKey: 'MOCK_RWF_ADDRESS', factory: MockRWF__factory, contractAlias: 'MockRWF' },
    {
      addressKey: 'ECO_CREDITS_ADDRESS',
      factory: EcoCredits__factory,
      contractAlias: 'EcoCredits',
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  async initializeContracts(provider: JsonRpcProvider, signer: Wallet): Promise<void> {
    this.provider = provider;
    this.signer = signer;
    this.logger.log('ContractService received provider and signer.');
    await this.initializeCoreContracts();
  }

  private async initializeCoreContracts(): Promise<void> {
    this.logger.log('Initializing core contracts from ContractService...');
    for (const config of this.contractConfigurations) {
      const address = this.configService.get<string>(config.addressKey);
      if (address && ethers.isAddress(address)) {
        try {
          const contractInstance = config.factory.connect(address, this.signer);
          this.contracts.set(config.contractAlias, contractInstance);
          this.logger.log(`Initialized contract: ${config.contractAlias} at ${address}`);
        } catch (error) {
          this.logger.error(
            `Failed to initialize contract ${config.contractAlias} at ${address} using factory. Ensure ABI (from TypeChain) and address are correct.`,
            (error as Error).stack,
          );
        }
      } else {
        this.logger.warn(
          `${config.addressKey} not found or invalid in config. Contract ${config.contractAlias} will not be initialized.`,
        );
      }
    }
    this.logger.log(
      `Finished initializing core contracts in ContractService. Total initialized: ${this.contracts.size}`,
    );
  }

  getContract<T extends EthersContract>(contractAlias: string): T {
    const contract = this.contracts.get(contractAlias);
    if (!contract) {
      this.logger.error(`Contract with alias "${contractAlias}" not found or not initialized.`);
      throw new Error(`Contract "${contractAlias}" not initialized.`);
    }
    return contract as T;
  }

  getGovernanceContract(): RwaGovernor {
    return this.getContract<RwaGovernor>('RwaGovernor');
  }

  getErc20VotesTokenContract(): RwaLandGovToken {
    return this.getContract<RwaLandGovToken>('RwaLandGovToken');
  }

  getTimelockControllerContract(): RwaTimelockController {
    return this.getContract<RwaTimelockController>('RwaTimelockController');
  }

  getLandParcelNFTContract(): LandParcelNFT {
    return this.getContract<LandParcelNFT>('LandParcelNFT');
  }

  getInheritanceContract(): InheritanceLogic {
    return this.getContract<InheritanceLogic>('InheritanceLogic');
  }

  getExpropriationContract(): ExpropriationCompensationManager {
    return this.getContract<ExpropriationCompensationManager>('ExpropriationCompensationManager');
  }

  getComplianceContract(): ComplianceRuleEngine {
    return this.getContract<ComplianceRuleEngine>('ComplianceRuleEngine');
  }

  getDisputeContract(): DisputeResolution {
    return this.getContract<DisputeResolution>('DisputeResolution');
  }

  async callContractGeneric(
    contractAddress: string,
    abi: any[] | Interface,
    methodName: string,
    params: any[] = [],
  ): Promise<any> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const result = await contract[methodName](...params);
      this.logger.debug(`Generic read call successful: ${contractAddress}.${methodName}`, {
        params,
        result: result?.toString(),
      });
      return result;
    } catch (error) {
      this.logger.error(`Generic read call failed: ${contractAddress}.${methodName}`, {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getContractEvents(
    contractAlias: string,
    eventName: string,
    fromBlock: number | string = 0,
    toBlock: number | string = 'latest',
  ): Promise<ethers.EventLog[]> {
    try {
      const contract = this.getContract<EthersContract>(contractAlias);

      const filter = (contract.filters as any)[eventName]();
      if (!filter) {
        throw new Error(
          `Event filter for "${eventName}" not found on contract "${contractAlias}". Check ABI and TypeChain generation.`,
        );
      }
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      return events as ethers.EventLog[];
    } catch (error) {
      this.logger.error(
        `Failed to get contract events for ${contractAlias}.${eventName}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
