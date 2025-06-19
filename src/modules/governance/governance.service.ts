import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThan } from 'typeorm';
import { Proposal, ProposalType, ProposalStatus } from './entities/proposal.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  CreateProposalDto,
  UpdateProposalDto,
  VoteOnProposalDto,
  ExecuteProposalDto,
  ProposalResponseDto,
  ProposalListResponseDto,
  ProposalStatisticsDto,
  GovernanceStatisticsDto,
} from './dto/governance.dto';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async createProposal(createProposalDto: CreateProposalDto): Promise<Proposal> {
    try {
      // Store proposal details in IPFS
      const proposalData = {
        title: createProposalDto.title,
        description: createProposalDto.description,
        proposalType: createProposalDto.proposalType,
        targetContract: createProposalDto.targetContract,
        functionSignature: createProposalDto.functionSignature,
        calldata: createProposalDto.calldata,
        createdAt: new Date().toISOString(),
      };

      const ipfsHash = await this.ipfsService.uploadJson(proposalData);

      // Calculate voting period end time
      const votingPeriodHours = createProposalDto.votingPeriodHours || 168; // Default 7 days
      const votingEndTime = new Date();
      votingEndTime.setHours(votingEndTime.getHours() + votingPeriodHours);

      const proposal = this.proposalRepository.create({
        ...createProposalDto,
        ipfsHash,
        status: ProposalStatus.PENDING,
        votingEndTime,
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        voters: [],
      });

      const savedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(`Governance proposal created with ID: ${savedProposal.id}`);

      // Create on-chain proposal via blockchain service
      try {
        const txHash = await this.blockchainService.createGovernanceProposal({
          proposalId: savedProposal.id,
          ipfsHash,
          votingPeriod: votingPeriodHours * 3600, // Convert to seconds
          targetContract: createProposalDto.targetContract,
          functionSignature: createProposalDto.functionSignature,
          calldata: createProposalDto.calldata,
        });

        savedProposal.onChainProposalId = txHash; // This would be the actual proposal ID from the contract
        savedProposal.status = ProposalStatus.ACTIVE;
        await this.proposalRepository.save(savedProposal);

        this.logger.log(`On-chain proposal created with tx hash: ${txHash}`);
      } catch (error) {
        this.logger.error('Failed to create on-chain proposal', error);
        // Keep the proposal in pending status if on-chain creation fails
      }

      // Send notification to governance participants
      await this.notifyGovernanceParticipants(savedProposal);

      return savedProposal;
    } catch (error) {
      this.logger.error('Failed to create governance proposal', error);
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    proposalType?: ProposalType,
    status?: ProposalStatus,
    proposer?: string,
  ): Promise<ProposalListResponseDto> {
    try {
      const where: FindOptionsWhere<Proposal> = {};
      
      if (proposalType) where.proposalType = proposalType;
      if (status) where.status = status;
      if (proposer) where.proposer = proposer.toLowerCase();

      const [proposals, total] = await this.proposalRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        proposals: proposals.map(proposal => this.mapToResponseDto(proposal)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch governance proposals', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Proposal> {
    try {
      const proposal = await this.proposalRepository.findOne({ where: { id } });
      if (!proposal) {
        throw new NotFoundException(`Governance proposal with ID ${id} not found`);
      }
      return proposal;
    } catch (error) {
      this.logger.error(`Failed to find governance proposal with ID: ${id}`, error);
      throw error;
    }
  }

  async findByOnChainId(onChainProposalId: string): Promise<Proposal | null> {
    try {
      return await this.proposalRepository.findOne({
        where: { onChainProposalId },
      });
    } catch (error) {
      this.logger.error(`Failed to find proposal by on-chain ID: ${onChainProposalId}`, error);
      throw error;
    }
  }

  async update(id: string, updateProposalDto: UpdateProposalDto): Promise<Proposal> {
    try {
      const proposal = await this.findOne(id);

      // Only allow updates if proposal is still pending
      if (proposal.status !== ProposalStatus.PENDING) {
        throw new BadRequestException('Cannot update proposal that is not pending');
      }

      Object.assign(proposal, updateProposalDto);
      const updatedProposal = await this.proposalRepository.save(proposal);
      
      this.logger.log(`Governance proposal updated with ID: ${id}`);
      return updatedProposal;
    } catch (error) {
      this.logger.error(`Failed to update governance proposal with ID: ${id}`, error);
      throw error;
    }
  }

  async vote(id: string, voteDto: VoteOnProposalDto): Promise<Proposal> {
    try {
      const proposal = await this.findOne(id);

      if (proposal.status !== ProposalStatus.ACTIVE) {
        throw new BadRequestException('Proposal is not active for voting');
      }

      if (new Date() > proposal.votingEndTime) {
        throw new BadRequestException('Voting period has ended');
      }

      // Check if user has already voted
      if (proposal.voters.includes(voteDto.voter)) {
        throw new BadRequestException('User has already voted on this proposal');
      }

      // Record the vote on-chain first
      try {
        const txHash = await this.blockchainService.voteOnProposal({
          proposalId: proposal.onChainProposalId,
          voter: voteDto.voter,
          support: voteDto.support,
          votingPower: voteDto.votingPower,
        });

        this.logger.log(`On-chain vote recorded with tx hash: ${txHash}`);
      } catch (error) {
        this.logger.error('Failed to record vote on-chain', error);
        throw new BadRequestException('Failed to record vote on blockchain');
      }

      // Update local vote counts
      proposal.voters.push(voteDto.voter);
      
      switch (voteDto.support) {
        case 'FOR':
          proposal.forVotes += voteDto.votingPower;
          break;
        case 'AGAINST':
          proposal.againstVotes += voteDto.votingPower;
          break;
        case 'ABSTAIN':
          proposal.abstainVotes += voteDto.votingPower;
          break;
      }

      const updatedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(`Vote recorded for proposal ${id} by ${voteDto.voter}`);

      // Send notification about the vote
      await this.notificationService.create({
        userId: proposal.proposer,
        type: 'GOVERNANCE_VOTE_CAST',
        title: 'New Vote on Your Proposal',
        message: `A new vote has been cast on your proposal "${proposal.title}"`,
        data: { 
          proposalId: id, 
          voter: voteDto.voter,
          support: voteDto.support,
          votingPower: voteDto.votingPower,
        },
      });

      return updatedProposal;
    } catch (error) {
      this.logger.error(`Failed to vote on proposal with ID: ${id}`, error);
      throw error;
    }
  }

  async execute(id: string, executeDto: ExecuteProposalDto): Promise<Proposal> {
    try {
      const proposal = await this.findOne(id);

      if (proposal.status !== ProposalStatus.SUCCEEDED) {
        throw new BadRequestException('Proposal must be in succeeded status to execute');
      }

      // Execute the proposal on-chain
      try {
        const txHash = await this.blockchainService.executeProposal({
          proposalId: proposal.onChainProposalId,
          executedBy: executeDto.executedBy,
        });

        proposal.status = ProposalStatus.EXECUTED;
        proposal.executedAt = new Date();
        proposal.executedBy = executeDto.executedBy;
        proposal.executionTxHash = txHash;

        const updatedProposal = await this.proposalRepository.save(proposal);
        this.logger.log(`Proposal executed with ID: ${id}`);

        // Send notification about execution
        await this.notificationService.create({
          userId: proposal.proposer,
          type: 'GOVERNANCE_PROPOSAL_EXECUTED',
          title: 'Proposal Executed',
          message: `Your proposal "${proposal.title}" has been executed successfully`,
          data: { 
            proposalId: id, 
            executedBy: executeDto.executedBy,
            transactionHash: txHash,
          },
        });

        return updatedProposal;
      } catch (error) {
        this.logger.error('Failed to execute proposal on-chain', error);
        throw new BadRequestException('Failed to execute proposal on blockchain');
      }
    } catch (error) {
      this.logger.error(`Failed to execute proposal with ID: ${id}`, error);
      throw error;
    }
  }

  async cancel(id: string, cancelledBy: string, reason: string): Promise<Proposal> {
    try {
      const proposal = await this.findOne(id);

      if (proposal.status === ProposalStatus.EXECUTED) {
        throw new BadRequestException('Cannot cancel an executed proposal');
      }

      proposal.status = ProposalStatus.CANCELLED;
      proposal.cancelledAt = new Date();
      proposal.cancelledBy = cancelledBy;
      proposal.cancellationReason = reason;

      const updatedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(`Proposal cancelled by ${cancelledBy}: ${id}`);

      return updatedProposal;
    } catch (error) {
      this.logger.error(`Failed to cancel proposal with ID: ${id}`, error);
      throw error;
    }
  }

  async updateProposalStatus(): Promise<void> {
    try {
      // Find all active proposals that have ended voting
      const endedProposals = await this.proposalRepository.find({
        where: {
          status: ProposalStatus.ACTIVE,
          votingEndTime: MoreThan(new Date()) as any,
        },
      });

      for (const proposal of endedProposals) {
        // Determine if proposal succeeded based on voting results
        const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        const quorumMet = totalVotes >= (proposal.quorumRequired || 0);
        const majorityFor = proposal.forVotes > proposal.againstVotes;

        if (quorumMet && majorityFor) {
          proposal.status = ProposalStatus.SUCCEEDED;
        } else {
          proposal.status = ProposalStatus.DEFEATED;
        }

        await this.proposalRepository.save(proposal);
        this.logger.log(`Updated proposal status: ${proposal.id} -> ${proposal.status}`);
      }
    } catch (error) {
      this.logger.error('Failed to update proposal statuses', error);
    }
  }

  async getProposalStatistics(): Promise<ProposalStatisticsDto> {
    try {
      const total = await this.proposalRepository.count();
      
      const statusCounts = {} as Record<ProposalStatus, number>;
      for (const status of Object.values(ProposalStatus)) {
        statusCounts[status] = await this.proposalRepository.count({
          where: { status },
        });
      }

      const typeCounts = {} as Record<ProposalType, number>;
      for (const type of Object.values(ProposalType)) {
        typeCounts[type] = await this.proposalRepository.count({
          where: { proposalType: type },
        });
      }

      // Get recent proposals (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentProposals = await this.proposalRepository.count({
        where: {
          createdAt: MoreThan(thirtyDaysAgo) as any,
        },
      });

      return {
        totalProposals: total,
        proposalsByStatus: statusCounts,
        proposalsByType: typeCounts,
        recentProposals,
      };
    } catch (error) {
      this.logger.error('Failed to get proposal statistics', error);
      throw error;
    }
  }

  async getGovernanceStatistics(): Promise<GovernanceStatisticsDto> {
    try {
      const proposalStats = await this.getProposalStatistics();
      
      // Calculate participation metrics
      const activeProposals = await this.proposalRepository.find({
        where: { status: ProposalStatus.ACTIVE },
      });

      let totalVoters = 0;
      let totalVotingPower = 0;
      
      for (const proposal of activeProposals) {
        totalVoters += proposal.voters.length;
        totalVotingPower += proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
      }

      const averageParticipation = activeProposals.length > 0 
        ? totalVoters / activeProposals.length 
        : 0;

      return {
        ...proposalStats,
        activeProposals: activeProposals.length,
        totalVoters,
        totalVotingPower,
        averageParticipation: Math.round(averageParticipation * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get governance statistics', error);
      throw error;
    }
  }

  private async notifyGovernanceParticipants(proposal: Proposal): Promise<void> {
    // This would notify all governance token holders about the new proposal
    // For now, we'll just log it
    this.logger.log(`Notifying governance participants about proposal: ${proposal.id}`);
  }

  private mapToResponseDto(proposal: Proposal): ProposalResponseDto {
    return {
      id: proposal.id,
      onChainProposalId: proposal.onChainProposalId,
      proposalType: proposal.proposalType,
      status: proposal.status,
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      abstainVotes: proposal.abstainVotes,
      quorumRequired: proposal.quorumRequired,
      votingEndTime: proposal.votingEndTime,
      createdAt: proposal.createdAt,
      executedAt: proposal.executedAt,
      executedBy: proposal.executedBy,
      executionTxHash: proposal.executionTxHash,
    };
  }
}
