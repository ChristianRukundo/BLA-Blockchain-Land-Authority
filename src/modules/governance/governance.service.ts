import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThan, LessThan } from 'typeorm';
import { ethers, keccak256, toUtf8Bytes, EventLog } from 'ethers'; // Added EventLog import
import {
  Proposal,
  ProposalType,
  ProposalStatus,
  Vote,
  VoteChoice,
} from './entities/proposal.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { CreateNotificationDto } from '../notification/dto/notification.dto';
import {
  BlockchainService,
  CreateOnChainProposalParams,
  OnChainProposalResult,
  CancelOnChainProposalParams,
} from '../blockchain/blockchain.service';
import { NotificationType } from '../notification/enums/notification.enum'; // Assuming this exists
import {
  CreateProposalDto,
  UpdateProposalDto,
  ExecuteProposalDto,
  VoteOnProposalDto,
  ProposalResponseDto,
  ProposalListResponseDto,
  ProposalStatisticsDto,
  GovernanceStatisticsDto,
  CancelProposalDto,
  ProposalFilterDto,
  VotingPowerResponseDto,
} from './dto/governance.dto';
// Removed RwaTimelockController import from here as it's used via BlockchainService -> ContractService

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    private readonly ipfsService: IpfsService,
    private readonly notificationService: NotificationService,
    private readonly blockchainService: BlockchainService, // BlockchainService is injected
  ) {}

  private calculateDescriptionHash(descriptionForProposeFunction: string): string {
    return keccak256(toUtf8Bytes(descriptionForProposeFunction));
  }

  async createProposal(createProposalDto: CreateProposalDto): Promise<ProposalResponseDto> {
    this.logger.log(
      `Service: Attempting to create proposal titled "${createProposalDto.title}" by ${createProposalDto.proposer}`,
    );
    try {
      const proposalDetailsForIpfs = {
        title: createProposalDto.title,
        description: createProposalDto.description,
        proposalType: createProposalDto.proposalType,
        proposer: createProposalDto.proposer,
        targets: createProposalDto.targets,
        values: createProposalDto.values,
        calldatas: createProposalDto.calldatas,
      };

      const ipfsContentHash = await this.ipfsService.uploadJson(proposalDetailsForIpfs);
      this.logger.log(`Proposal details uploaded to IPFS: ${ipfsContentHash}`);
      const onChainDescriptionArgument = `ipfs://${ipfsContentHash}`;

      const votingEndDate = createProposalDto.votingEndDate
        ? new Date(createProposalDto.votingEndDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      let timelockDelaySeconds =
        createProposalDto.timelockDelay !== undefined ? createProposalDto.timelockDelay : 172800;
      try {
        this.logger.log(
          `Using timelock delay: ${timelockDelaySeconds} seconds (from DTO or default)`,
        );
      } catch (e) {
        this.logger.warn(
          `Could not dynamically fetch minDelay from TimelockController, using default/DTO value: ${timelockDelaySeconds}s. Error: ${(e as Error).message}`,
        );
      }

      const newProposalEntity = this.proposalRepository.create({
        proposalType: createProposalDto.proposalType,
        proposer: createProposalDto.proposer.toLowerCase(),
        title: createProposalDto.title,
        description: createProposalDto.description,
        targets: createProposalDto.targets,
        values: createProposalDto.values,
        signatures: createProposalDto.signatures || [],
        calldatas: createProposalDto.calldatas,
        votingEndDate,
        quorumRequired: createProposalDto.quorumRequired || '4000000000000000000',
        votingThreshold: createProposalDto.votingThreshold || 50.0,
        timelockDelay: timelockDelaySeconds,
        expirationDate: createProposalDto.expirationDate
          ? new Date(createProposalDto.expirationDate)
          : undefined,
        metadata: createProposalDto.metadata,
        proposalId: '',
        detailsHash: onChainDescriptionArgument,
        status: ProposalStatus.PENDING,
        votesFor: '0',
        votesAgainst: '0',
        votesAbstain: '0',
        totalVotingPower: '0',
      });

      let savedProposal = await this.proposalRepository.save(newProposalEntity);
      this.logger.log(`Initial proposal saved to DB with ID: ${savedProposal.id}`);

      try {
        const onChainParams: CreateOnChainProposalParams = {
          targets: createProposalDto.targets,
          values: createProposalDto.values,
          calldatas: createProposalDto.calldatas,
          description: onChainDescriptionArgument,
        };
        const onChainResult = await this.blockchainService.createProposal(onChainParams);

        savedProposal.proposalId = onChainResult.onChainProposalId;
        savedProposal.status = ProposalStatus.ACTIVE;
        savedProposal.createdBlock = String(onChainResult.blockNumber);

        if (onChainResult.voteStart) {
          savedProposal.votingStartBlock = onChainResult.voteStart.toString();
          try {
            const snapshotPower = await this.blockchainService.getVotingPowerAtSnapshot(
              ethers.ZeroAddress,
              onChainResult.voteStart,
            ); // Hacky way if getPastTotalSupply not available
            this.logger.log(
              `Snapshot total voting power attempt for block ${onChainResult.voteStart}. Value: (Needs direct method for total supply)`,
            );
            // Placeholder until getPastTotalSupply is properly exposed
            savedProposal.totalVotingPower = '100000000000000000000000000'; // Default or fetched value
          } catch (e) {
            this.logger.error(
              `Failed to get past total supply for snapshot at block ${onChainResult.voteStart}: ${(e as Error).message}`,
            );
          }
        }
        if (onChainResult.voteEnd) savedProposal.votingEndBlock = onChainResult.voteEnd.toString();

        savedProposal = await this.proposalRepository.save(savedProposal);
        this.logger.log(
          `Proposal on-chain creation successful. OnChain ID: ${onChainResult.onChainProposalId}, DB ID: ${savedProposal.id}, Tx: ${onChainResult.transactionHash}`,
        );
      } catch (onChainError) {
        this.logger.error(
          `On-chain proposal creation failed for DB ID ${savedProposal.id}: ${(onChainError as Error).message}`,
          (onChainError as Error).stack,
        );
        throw new BadRequestException(
          `On-chain proposal creation failed: ${(onChainError as Error).message}`,
        );
      }

      const notificationDto: CreateNotificationDto = {
        userId: savedProposal.proposer, // Or a generic system user/channel
        type: NotificationType.PROPOSAL_CREATED, // Ensure this enum value exists
        title: `New Proposal Created: ${savedProposal.title}`,
        content: `Your proposal "${savedProposal.title}" has been successfully created and is now active.`,
        data: { proposalDbId: savedProposal.id, onChainProposalId: savedProposal.proposalId },
      };
      await this.notificationService.createNotification(notificationDto);
      return this.mapToResponseDto(savedProposal);
    } catch (error) {
      this.logger.error(
        `Overall error in createProposal: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ... findAll, findOne, findByOnChainId, update methods as before ...
  async findAll(filters: ProposalFilterDto): Promise<ProposalListResponseDto> {
    const {
      page = 1,
      limit = 10,
      proposalType,
      status,
      proposer,
      createdDateFrom,
      createdDateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;
    this.logger.debug(`Service: Finding all proposals with filters: ${JSON.stringify(filters)}`);
    try {
      const queryBuilder = this.proposalRepository
        .createQueryBuilder('proposal')
        .leftJoinAndSelect('proposal.votes', 'vote');

      if (proposalType)
        queryBuilder.andWhere('proposal.proposalType = :proposalType', { proposalType });
      if (status) queryBuilder.andWhere('proposal.status = :status', { status });
      if (proposer)
        queryBuilder.andWhere('LOWER(proposal.proposer) = LOWER(:proposer)', {
          proposer: proposer.toLowerCase(),
        });
      if (createdDateFrom)
        queryBuilder.andWhere('proposal.createdAt >= :createdDateFrom', {
          createdDateFrom: new Date(createdDateFrom),
        });
      if (createdDateTo)
        queryBuilder.andWhere('proposal.createdAt <= :createdDateTo', {
          createdDateTo: new Date(createdDateTo),
        });

      const validSortByFields = [
        'id',
        'title',
        'proposer',
        'status',
        'proposalType',
        'createdAt',
        'votingEndDate',
        'executedDate',
      ];
      if (!validSortByFields.includes(sortBy)) {
        throw new BadRequestException(`Invalid sortBy field: ${sortBy}`);
      }
      const validSortOrder = ['ASC', 'DESC'];
      if (!validSortOrder.includes(sortOrder.toUpperCase())) {
        throw new BadRequestException(`Invalid sortOrder: ${sortOrder}`);
      }

      queryBuilder.orderBy(`proposal.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [proposals, total] = await queryBuilder.getManyAndCount();
      return { proposals: proposals.map(p => this.mapToResponseDto(p)), total, page, limit };
    } catch (error) {
      this.logger.error('Service: Failed to fetch proposals', (error as Error).stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<Proposal> {
    this.logger.debug(`Service: Finding proposal by DB ID: ${id}`);
    const proposal = await this.proposalRepository.findOne({ where: { id }, relations: ['votes'] });
    if (!proposal) {
      this.logger.warn(`Service: Proposal with DB ID ${id} not found.`);
      throw new NotFoundException(`Proposal with DB ID "${id}" not found.`);
    }
    return proposal;
  }

  async findByOnChainId(onChainProposalId: string): Promise<Proposal | null> {
    this.logger.debug(`Service: Finding proposal by OnChain ID: ${onChainProposalId}`);
    return await this.proposalRepository.findOne({
      where: { proposalId: onChainProposalId },
      relations: ['votes'],
    });
  }

  async update(id: string, updateProposalDto: UpdateProposalDto): Promise<ProposalResponseDto> {
    this.logger.log(`Service: Attempting to update proposal DB ID: ${id}`);
    const proposal = await this.findOne(id);
    if (![ProposalStatus.PENDING, ProposalStatus.ACTIVE].includes(proposal.status)) {
      throw new BadRequestException(`Cannot update proposal in status: ${proposal.status}.`);
    }
    let ipfsNeedsUpdate = false;
    if (updateProposalDto.title && proposal.title !== updateProposalDto.title) {
      proposal.title = updateProposalDto.title;
      ipfsNeedsUpdate = true;
    }
    if (updateProposalDto.description && proposal.description !== updateProposalDto.description) {
      proposal.description = updateProposalDto.description;
      ipfsNeedsUpdate = true;
    }
    if (updateProposalDto.votingEndDate)
      proposal.votingEndDate = new Date(updateProposalDto.votingEndDate);
    if (updateProposalDto.metadata)
      proposal.metadata = { ...proposal.metadata, ...updateProposalDto.metadata };

    if (ipfsNeedsUpdate) {
      const proposalIpfsData = {
        title: proposal.title,
        description: proposal.description,
        proposalType: proposal.proposalType,
        proposer: proposal.proposer,
        targets: proposal.targets,
        values: proposal.values,
        calldatas: proposal.calldatas,
      };
      const newIpfsHash = await this.ipfsService.uploadJson(proposalIpfsData);
      proposal.detailsHash = `ipfs://${newIpfsHash}`;
      this.logger.log(`Proposal ${id} IPFS detailsHash updated to: ${proposal.detailsHash}`);
    }

    const updatedProposal = await this.proposalRepository.save(proposal);
    this.logger.log(`Proposal DB ID ${id} updated successfully.`);
    return this.mapToResponseDto(updatedProposal);
  }

  async vote(id: string, voteDto: VoteOnProposalDto): Promise<ProposalResponseDto> {
    this.logger.log(`Service: Attempting vote on proposal DB ID ${id} by ${voteDto.voter}`);
    const proposal = await this.findOne(id);
    if (!proposal.proposalId)
      throw new BadRequestException('Proposal missing on-chain ID, cannot process vote.');
    if (proposal.status !== ProposalStatus.ACTIVE)
      throw new BadRequestException('Proposal not active for voting.');
    if (proposal.votingEndDate && new Date() >= new Date(proposal.votingEndDate))
      throw new BadRequestException('Voting period has ended.');

    const voterAddressLower = voteDto.voter.toLowerCase();
    if (proposal.votes.some(v => v.voter.toLowerCase() === voterAddressLower)) {
      throw new BadRequestException('User has already voted on this proposal.');
    }

    try {
      const onChainVoteTx = await this.blockchainService.voteOnProposal(
        proposal.proposalId,
        voteDto.choice,
        voteDto.reason,
      );
      this.logger.log(
        `On-chain vote tx sent for proposal ${proposal.proposalId}. Tx: ${onChainVoteTx.hash}`,
      );
      const receipt = await this.blockchainService.waitForTransaction(onChainVoteTx.hash, 1);
      if (!receipt || receipt.status !== 1) {
        this.logger.error(
          `On-chain vote transaction failed or reverted. Hash: ${onChainVoteTx.hash}`,
        );
        throw new Error(`On-chain vote transaction failed. Status: ${receipt?.status}`);
      }
      this.logger.log(
        `On-chain vote confirmed for proposal ${proposal.proposalId}. Block: ${receipt.blockNumber}`,
      );

      const newVote = this.voteRepository.create({
        proposalId: proposal.id,
        proposal,
        voter: voterAddressLower,
        choice: voteDto.choice,
        votingPower: voteDto.votingPower,
        voteDate: new Date(),
        blockNumber: String(receipt.blockNumber),
        transactionHash: receipt.hash,
        reason: voteDto.reason,
      });
      await this.voteRepository.save(newVote);

      const votingPowerBigInt = BigInt(voteDto.votingPower);
      if (voteDto.choice === VoteChoice.FOR)
        proposal.votesFor = (BigInt(proposal.votesFor) + votingPowerBigInt).toString();
      else if (voteDto.choice === VoteChoice.AGAINST)
        proposal.votesAgainst = (BigInt(proposal.votesAgainst) + votingPowerBigInt).toString();
      else if (voteDto.choice === VoteChoice.ABSTAIN)
        proposal.votesAbstain = (BigInt(proposal.votesAbstain) + votingPowerBigInt).toString();
      proposal.votes.push(newVote);

      this.updateProposalVotingOutcome(proposal);
      const updatedProposal = await this.proposalRepository.save(proposal);

      const notificationDto: CreateNotificationDto = {
        userId: proposal.proposer,
        type: NotificationType.VOTE_CAST,
        title: `Vote Cast on Your Proposal: ${proposal.title}`,
        content: `A vote (${voteDto.choice}) was cast on your proposal "${proposal.title}" by ${voterAddressLower}.`,
        data: {
          proposalDbId: id,
          onChainProposalId: proposal.proposalId,
          voter: voterAddressLower,
          choice: voteDto.choice,
        },
      };
      await this.notificationService.createNotification(notificationDto);
      this.logger.log(`Vote successfully recorded for proposal DB ID ${id}.`);
      return this.mapToResponseDto(updatedProposal);
    } catch (error) {
      this.logger.error(
        `Error recording vote for proposal ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  async queue(id: string): Promise<ProposalResponseDto> {
    this.logger.log(`Service: Attempting to queue proposal DB ID: ${id}`);
    const proposal = await this.findOne(id);
    if (proposal.status !== ProposalStatus.SUCCEEDED)
      throw new BadRequestException('Proposal must be SUCCEEDED to be queued.');
    if (proposal.queuedDate) throw new BadRequestException('Proposal has already been queued.');
    if (!proposal.detailsHash)
      throw new BadRequestException(
        'Proposal detailsHash (on-chain description for hashing) is missing.',
      );

    const descriptionHash = this.calculateDescriptionHash(proposal.detailsHash);

    try {
      const queueTx = await this.blockchainService.queueProposal(
        proposal.targets,
        proposal.values,
        proposal.calldatas,
        descriptionHash,
      );
      this.logger.log(`Queue tx sent for proposal DB ID ${id}. Tx: ${queueTx.hash}`);
      const receipt = await this.blockchainService.waitForTransaction(queueTx.hash, 1);
      if (!receipt || receipt.status !== 1) {
        this.logger.error(`Queue transaction failed or reverted. Hash: ${queueTx.hash}`);
        throw new Error(`Queue transaction failed. Status: ${receipt?.status}`);
      }
      this.logger.log(`Queue tx confirmed for proposal ${id}. Block: ${receipt.blockNumber}`);

      proposal.status = ProposalStatus.QUEUED;
      const queuedEvent = receipt.logs?.find(
        (log: any) => (log as EventLog).eventName === 'ProposalQueued',
      ) as EventLog | undefined;
      if (queuedEvent && queuedEvent.args) {
        proposal.queuedDate = new Date();
        proposal.earliestExecutionDate = new Date(Number(queuedEvent.args.eta) * 1000);
        this.logger.log(
          `ProposalQueued event processed. ETA: ${queuedEvent.args.eta} -> ${proposal.earliestExecutionDate.toISOString()}`,
        );
      } else {
        this.logger.warn(
          'ProposalQueued event not found in receipt. Calculating ETA manually based on timelockDelay.',
        );
        proposal.queuedDate = new Date();
        proposal.earliestExecutionDate = new Date(Date.now() + proposal.timelockDelay * 1000);
      }
      proposal.metadata = {
        ...proposal.metadata,
        queueTxHash: receipt.hash,
        queueBlock: Number(receipt.blockNumber),
      };

      const updatedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(
        `Proposal DB ID ${id} QUEUED. Earliest execution: ${updatedProposal.earliestExecutionDate?.toISOString()}`,
      );
      return this.mapToResponseDto(updatedProposal);
    } catch (error) {
      this.logger.error(
        `Error queuing proposal ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  async execute(id: string, executeDto: ExecuteProposalDto): Promise<ProposalResponseDto> {
    this.logger.log(`Service: Attempting to execute proposal DB ID: ${id}`);
    const proposal = await this.findOne(id);
    // Corrected: Should be ProposalStatus.QUEUED
    if (proposal.status !== ProposalStatus.QUEUED) {
      throw new BadRequestException('Proposal is not in QUEUED status for execution.');
    }
    if (!proposal.earliestExecutionDate || new Date() < new Date(proposal.earliestExecutionDate)) {
      throw new BadRequestException(
        `Proposal not yet eligible for execution. Earliest: ${proposal.earliestExecutionDate?.toISOString()}`,
      );
    }
    // This check was fine, just re-iterating the logic.
    // if (proposal.status === ProposalStatus.EXECUTED) throw new BadRequestException('Proposal has already been executed.');
    if (!proposal.detailsHash) throw new BadRequestException('Proposal detailsHash missing.');

    const descriptionHash = this.calculateDescriptionHash(proposal.detailsHash);

    try {
      const executeTx = await this.blockchainService.executeProposal(
        proposal.targets,
        proposal.values,
        proposal.calldatas,
        descriptionHash,
      );
      this.logger.log(`Execute tx sent for proposal DB ID ${id}. Tx: ${executeTx.hash}`);
      const receipt = await this.blockchainService.waitForTransaction(executeTx.hash, 1);
      if (!receipt || receipt.status !== 1) {
        this.logger.error(`Execute transaction failed or reverted. Hash: ${executeTx.hash}`);
        throw new Error(`Execute transaction failed. Status: ${receipt?.status}`);
      }
      this.logger.log(`Execute tx confirmed for proposal ${id}. Block: ${receipt.blockNumber}`);

      proposal.status = ProposalStatus.EXECUTED;
      proposal.executedDate = new Date();
      proposal.executionTransactionHash = receipt.hash;
      proposal.metadata = {
        ...proposal.metadata,
        executedBy: executeDto.executorAddress,
        executionBlock: Number(receipt.blockNumber),
        notes: executeDto.notes,
      };
      const updatedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(`Proposal DB ID ${id} EXECUTED.`);

      const notificationDto: CreateNotificationDto = {
        userId: proposal.proposer,
        type: NotificationType.PROPOSAL_EXECUTED,
        title: `Proposal Executed: ${proposal.title}`,
        content: `Your proposal "${proposal.title}" has been successfully executed.`,
        data: {
          proposalDbId: id,
          onChainProposalId: proposal.proposalId,
          executionTxHash: receipt.hash,
        },
      };
      await this.notificationService.createNotification(notificationDto);
      return this.mapToResponseDto(updatedProposal);
    } catch (error) {
      this.logger.error(
        `Error executing proposal ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  // ... cancel, updateProposalStatuses, updateProposalVotingOutcome, statistics methods, getVotingPower, notify, mapToResponseDto as before ...
  async cancel(id: string, cancelDto: CancelProposalDto): Promise<ProposalResponseDto> {
    this.logger.log(
      `Service: Attempting to cancel proposal DB ID: ${id} by ${cancelDto.cancelledBy}`,
    );
    const proposal = await this.findOne(id);
    const cancellableStatuses = [
      ProposalStatus.PENDING,
      ProposalStatus.ACTIVE,
      ProposalStatus.SUCCEEDED,
      ProposalStatus.QUEUED,
    ];
    if (!cancellableStatuses.includes(proposal.status)) {
      throw new BadRequestException(`Cannot cancel proposal in status: ${proposal.status}.`);
    }
    if (!proposal.detailsHash)
      throw new BadRequestException(
        'Proposal detailsHash (on-chain description for hashing) is missing for cancellation.',
      );

    const descriptionHash = this.calculateDescriptionHash(proposal.detailsHash);
    const cancelParams: CancelOnChainProposalParams = {
      targets: proposal.targets,
      values: proposal.values,
      calldatas: proposal.calldatas,
      descriptionHash: descriptionHash,
    };

    try {
      const cancelTx = await this.blockchainService.cancelProposal(cancelParams);
      this.logger.log(`On-chain cancel tx sent for proposal DB ID ${id}. Tx: ${cancelTx.hash}`);
      const receipt = await this.blockchainService.waitForTransaction(cancelTx.hash, 1);
      if (!receipt || receipt.status !== 1) {
        this.logger.error(`Cancel transaction failed or reverted. Hash: ${cancelTx.hash}`);
        throw new Error(`Cancel transaction failed. Status: ${receipt?.status}`);
      }
      this.logger.log(
        `On-chain cancellation confirmed for proposal DB ID ${id}. Block: ${receipt.blockNumber}`,
      );

      proposal.status = ProposalStatus.CANCELLED;
      proposal.cancellationReason = cancelDto.reason;
      proposal.metadata = {
        ...proposal.metadata,
        cancelledBy: cancelDto.cancelledBy,
        cancelledAt: new Date().toISOString(),
        cancellationTxHash: receipt.hash,
        cancellationBlock: Number(receipt.blockNumber),
      };
      const updatedProposal = await this.proposalRepository.save(proposal);
      this.logger.log(`Proposal DB ID ${id} cancelled successfully.`);
      return this.mapToResponseDto(updatedProposal);
    } catch (error) {
      this.logger.error(
        `Error cancelling proposal ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException((error as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateProposalStatuses(): Promise<{ updated: number; message: string }> {
    this.logger.log('Service: Starting scheduled job to update proposal statuses.');
    let updatedCount = 0;
    const now = new Date();

    const activeProposalsToEnd = await this.proposalRepository.find({
      where: { status: ProposalStatus.ACTIVE, votingEndDate: LessThan(now) },
      relations: ['votes'],
    });
    this.logger.debug(
      `Found ${activeProposalsToEnd.length} active proposals whose voting period has ended.`,
    );
    for (const proposal of activeProposalsToEnd) {
      this.updateProposalVotingOutcome(proposal);
      await this.proposalRepository.save(proposal);
      updatedCount++;
      this.logger.log(
        `Status for proposal ${proposal.id} updated to ${proposal.status} (voting ended).`,
      );
    }

    const proposalsToExpire = await this.proposalRepository.find({
      where: [
        { status: ProposalStatus.PENDING, expirationDate: LessThan(now) },
        { status: ProposalStatus.ACTIVE, expirationDate: LessThan(now) },
      ],
    });
    this.logger.debug(`Found ${proposalsToExpire.length} proposals to mark as EXPIRED.`);
    for (const proposal of proposalsToExpire) {
      if (proposal.status !== ProposalStatus.EXPIRED) {
        proposal.status = ProposalStatus.EXPIRED;
        await this.proposalRepository.save(proposal);
        updatedCount++;
        this.logger.log(`Proposal ${proposal.id} has EXPIRED.`);
      }
    }
    this.logger.log(`Proposal status update job finished. ${updatedCount} proposals processed.`);
    return {
      updated: updatedCount,
      message: `${updatedCount} proposals were processed for status updates.`,
    };
  }

  private updateProposalVotingOutcome(proposal: Proposal): void {
    this.logger.debug(`Updating voting outcome for proposal DB ID: ${proposal.id}`);
    if (
      !proposal.quorumRequired ||
      !proposal.totalVotingPower ||
      BigInt(proposal.totalVotingPower) === 0n
    ) {
      this.logger.warn(
        `Quorum requirement or total voting power missing/zero for proposal ${proposal.id}. Cannot determine outcome accurately. Marking DEFEATED.`,
      );
      proposal.status = ProposalStatus.DEFEATED;
      proposal.quorumReached = false;
      proposal.thresholdReached = false;
      return;
    }

    const totalVotesCasted =
      BigInt(proposal.votesFor) + BigInt(proposal.votesAgainst) + BigInt(proposal.votesAbstain);
    const quorumRequiredBigInt = BigInt(proposal.quorumRequired);
    proposal.quorumReached = totalVotesCasted >= quorumRequiredBigInt;

    if (!proposal.quorumReached) {
      proposal.status = ProposalStatus.DEFEATED;
      proposal.thresholdReached = false;
      this.logger.log(
        `Proposal ${proposal.id} (OnChain: ${proposal.proposalId}) DEFEATED (quorum ${totalVotesCasted}/${quorumRequiredBigInt} not met).`,
      );
      return;
    }

    const forVotesBigInt = BigInt(proposal.votesFor);
    const againstVotesBigInt = BigInt(proposal.votesAgainst);
    const effectiveVotes = forVotesBigInt + againstVotesBigInt;

    if (effectiveVotes === 0n) {
      proposal.thresholdReached = false;
    } else {
      const thresholdBasisPoints = BigInt(Math.floor(proposal.votingThreshold * 100));
      proposal.thresholdReached = forVotesBigInt * 10000n > thresholdBasisPoints * effectiveVotes;
    }

    if (proposal.thresholdReached) {
      proposal.status = ProposalStatus.SUCCEEDED;
      this.logger.log(`Proposal ${proposal.id} (OnChain: ${proposal.proposalId}) SUCCEEDED.`);
    } else {
      proposal.status = ProposalStatus.DEFEATED;
      this.logger.log(
        `Proposal ${proposal.id} (OnChain: ${proposal.proposalId}) DEFEATED (threshold not met).`,
      );
    }
  }

  async getProposalStatistics(): Promise<ProposalStatisticsDto> {
    this.logger.debug('Service: Getting proposal statistics.');
    try {
      const totalProposals = await this.proposalRepository.count();
      const proposalsByStatus: Partial<Record<ProposalStatus, number>> = {};
      const proposalsByType: Partial<Record<ProposalType, number>> = {};

      const statusResults = await this.proposalRepository.query(
        'SELECT status, COUNT(id)::int as count FROM proposals GROUP BY status',
      );
      statusResults.forEach(
        (r: { status: ProposalStatus; count: number }) => (proposalsByStatus[r.status] = r.count),
      );

      const typeResults = await this.proposalRepository.query(
        'SELECT "proposalType", COUNT(id)::int as count FROM proposals GROUP BY "proposalType"',
      );
      typeResults.forEach(
        (r: { proposalType: ProposalType; count: number }) =>
          (proposalsByType[r.proposalType] = r.count),
      );

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentProposals = await this.proposalRepository.count({
        where: { createdAt: MoreThan(thirtyDaysAgo) },
      });

      return {
        totalProposals,
        proposalsByStatus: proposalsByStatus as Record<ProposalStatus, number>,
        proposalsByType: proposalsByType as Record<ProposalType, number>,
        recentProposals,
      };
    } catch (error) {
      this.logger.error('Service: Failed to get proposal statistics', (error as Error).stack);
      throw new HttpException((error as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getGovernanceStatistics(): Promise<GovernanceStatisticsDto> {
    this.logger.debug('Service: Getting overall governance statistics.');
    try {
      const proposalStats = await this.getProposalStatistics();
      const activeProposalsCount = await this.proposalRepository.count({
        where: { status: ProposalStatus.ACTIVE },
      });

      const activeProposalEntities = await this.proposalRepository.find({
        where: { status: ProposalStatus.ACTIVE },
        relations: ['votes'],
      });
      let uniqueVoterSet = new Set<string>();
      let totalCastVotingPowerInActiveProposalsBigInt = 0n;
      activeProposalEntities.forEach(p => {
        p.votes.forEach(v => {
          uniqueVoterSet.add(v.voter.toLowerCase());
          totalCastVotingPowerInActiveProposalsBigInt += BigInt(v.votingPower);
        });
      });

      return {
        ...proposalStats,
        activeProposalsCount,
        totalUniqueVotersInActiveProposals: uniqueVoterSet.size,
        totalCastVotingPowerInActiveProposals:
          totalCastVotingPowerInActiveProposalsBigInt.toString(),
      };
    } catch (error) {
      this.logger.error('Service: Failed to get governance statistics', (error as Error).stack);
      throw new HttpException((error as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getVotingPower(proposalId: string, address: string): Promise<VotingPowerResponseDto> {
    this.logger.debug(
      `Service: Getting voting power for proposal DB ID ${proposalId}, address ${address}`,
    );
    const proposal = await this.findOne(proposalId); // Corrected to use `proposalId`
    const voterAddressLower = address.toLowerCase();
    const hasVoted = proposal.votes.some(v => v.voter.toLowerCase() === voterAddressLower);
    let votingPowerStr = '0';

    const snapshotBlock = proposal.votingStartBlock || proposal.createdBlock;
    if (snapshotBlock && snapshotBlock !== '0' && snapshotBlock.trim() !== '') {
      try {
        votingPowerStr = await this.blockchainService.getVotingPowerAtSnapshot(
          voterAddressLower,
          snapshotBlock,
        );
      } catch (e) {
        this.logger.warn(
          `Could not fetch voting power for ${voterAddressLower} on proposal ${proposal.id} at block ${snapshotBlock}: ${(e as Error).message}`,
        );
      }
    } else {
      this.logger.warn(
        `No valid snapshot block for proposal ${proposal.id} to fetch voting power.`,
      );
    }

    return {
      proposalId: proposal.id,
      onChainProposalId: proposal.proposalId,
      address: voterAddressLower,
      votingPower: votingPowerStr,
      hasVoted,
    };
  }

  private async notifyGovernanceParticipants(proposal: Proposal, subject: string): Promise<void> {
    this.logger.log(
      `Notification Placeholder: ${subject} - Proposal "${proposal.title}" (DB ID: ${proposal.id})`,
    );
    const notificationDto: CreateNotificationDto = {
      userId: proposal.proposer, // Example
      type: NotificationType.GENERIC_NOTIFICATION, // Use an appropriate type
      title: subject,
      content: `Details for proposal "${proposal.title}" have been updated or created.`,
      data: { proposalDbId: proposal.id, onChainProposalId: proposal.proposalId },
    };
    try {
      await this.notificationService.createNotification(notificationDto);
    } catch (e) {
      this.logger.error(
        `Failed to send notification for proposal ${proposal.id}: ${(e as Error).message}`,
      );
    }
  }

  public mapToResponseDto(proposal: Proposal): ProposalResponseDto {
    return {
      id: proposal.id,
      onChainProposalId: proposal.proposalId,
      proposalType: proposal.proposalType,
      status: proposal.status,
      title: proposal.title,
      description: proposal.description,
      detailsHash: proposal.detailsHash,
      proposer: proposal.proposer,
      targets: proposal.targets,
      values: proposal.values,
      signatures: proposal.signatures,
      calldatas: proposal.calldatas,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      quorumRequired: proposal.quorumRequired,
      quorumReached: proposal.quorumReached,
      thresholdReached: proposal.thresholdReached,
      votingThreshold: proposal.votingThreshold,
      totalVotingPowerAtSnapshot: proposal.totalVotingPower,
      votingStartDate: proposal.votingStartDate,
      votingEndDate: proposal.votingEndDate,
      queuedDate: proposal.queuedDate,
      executedDate: proposal.executedDate,
      earliestExecutionDate: proposal.earliestExecutionDate,
      executionTransactionHash: proposal.executionTransactionHash,
      cancellationReason: proposal.cancellationReason,
      metadata: proposal.metadata,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      canVote: proposal.canVote,
      canQueue: proposal.canQueue,
      canExecute: proposal.canExecute,
    };
  }
}
