import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne, // Added
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ProposalStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUCCEEDED = 'SUCCEEDED',
  DEFEATED = 'DEFEATED',
  QUEUED = 'QUEUED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ProposalType {
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',
  CONTRACT_UPGRADE = 'CONTRACT_UPGRADE',
  TREASURY_ALLOCATION = 'TREASURY_ALLOCATION',
  RULE_MODIFICATION = 'RULE_MODIFICATION',
  EMERGENCY_ACTION = 'EMERGENCY_ACTION',
  GENERAL_PROPOSAL = 'GENERAL_PROPOSAL',
}

export enum VoteChoice {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
  ABSTAIN = 'ABSTAIN',
}

@Entity('proposals')
export class Proposal {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'On-chain proposal ID' })
  @Column({ unique: true }) // Assuming on-chain proposal ID should be unique
  proposalId: string;

  @ApiProperty({ description: 'Proposal type', enum: ProposalType })
  @Column({
    type: 'enum',
    enum: ProposalType,
  })
  proposalType: ProposalType;

  @ApiProperty({ description: 'Proposal status', enum: ProposalStatus })
  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @ApiProperty({ description: 'Proposer wallet address' })
  @Column()
  proposer: string;

  @ApiProperty({ description: 'Proposal title' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Proposal description' })
  @Column('text')
  description: string;

  @ApiProperty({ description: 'IPFS hash of detailed proposal' })
  @Column({ nullable: true })
  detailsHash?: string;

  @ApiProperty({ description: 'Target contract addresses' })
  @Column('simple-array')
  targets: string[];

  @ApiProperty({ description: 'Values to send with calls' })
  @Column('simple-array')
  values: string[]; // Typically ETH values, represented as strings for precision

  @ApiProperty({ description: 'Function signatures to call' })
  @Column('simple-array')
  signatures: string[];

  @ApiProperty({ description: 'Encoded call data' })
  @Column('simple-array')
  calldatas: string[];

  // REMOVED: createdDate (redundant with createdAt from @CreateDateColumn)

  @ApiProperty({ description: 'Block number when created' })
  @Column({ nullable: true }) // Made nullable as it might not be available immediately
  createdBlock?: string;

  @ApiProperty({ description: 'Voting start date' })
  @Column('timestamp', { nullable: true })
  votingStartDate?: Date;

  @ApiProperty({ description: 'Voting end date' })
  @Column('timestamp', { nullable: true })
  votingEndDate?: Date;

  @ApiProperty({ description: 'Voting start block' })
  @Column({ nullable: true })
  votingStartBlock?: string;

  @ApiProperty({ description: 'Voting end block' })
  @Column({ nullable: true })
  votingEndBlock?: string;

  @ApiProperty({ description: 'Votes for the proposal (sum of voting power)' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesFor: string;

  @ApiProperty({ description: 'Votes against the proposal (sum of voting power)' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesAgainst: string;

  @ApiProperty({ description: 'Abstain votes (sum of voting power)' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesAbstain: string;

  @ApiProperty({ description: 'Total voting power at proposal creation snapshot' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  totalVotingPower: string; // Snapshot of total eligible power when proposal became active

  @ApiProperty({ description: 'Quorum required for proposal (as voting power)' })
  @Column('decimal', { precision: 78, scale: 0 })
  quorumRequired: string;

  @ApiProperty({ description: 'Voting threshold percentage (e.g., 50.0 for >50%)' })
  @Column('decimal', { precision: 5, scale: 2, default: 50.0 })
  votingThreshold: number;

  @ApiProperty({ description: 'Whether quorum has been reached' })
  @Column('boolean', { default: false })
  quorumReached: boolean;

  @ApiProperty({ description: 'Whether voting threshold has been reached' })
  @Column('boolean', { default: false })
  thresholdReached: boolean;

  @ApiProperty({ description: 'Date when proposal was queued' })
  @Column('timestamp', { nullable: true })
  queuedDate?: Date;

  @ApiProperty({ description: 'Timelock delay in seconds' })
  @Column('int', { default: 172800 }) // 2 days
  timelockDelay: number;

  @ApiProperty({ description: 'Earliest execution date after queuing' })
  @Column('timestamp', { nullable: true })
  earliestExecutionDate?: Date;

  @ApiProperty({ description: 'Date when proposal was executed' })
  @Column('timestamp', { nullable: true })
  executedDate?: Date;

  @ApiProperty({ description: 'Execution transaction hash' })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Proposal expiration date (if applicable)' })
  @Column('timestamp', { nullable: true })
  expirationDate?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Additional metadata (e.g., on-chain results, executedBy)' })
  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ type: () => [Vote], description: 'Votes cast on this proposal' })
  @OneToMany(() => Vote, vote => vote.proposal, { cascade: ['insert', 'update'] }) // Added cascade for easier vote saving
  votes: Vote[];

  // Computed properties
  get canVote(): boolean {
    return (
      this.status === ProposalStatus.ACTIVE &&
      this.votingEndDate &&
      new Date(this.votingEndDate) > new Date()
    );
  }

  get canQueue(): boolean {
    return this.status === ProposalStatus.SUCCEEDED && !this.queuedDate;
  }

  get canExecute(): boolean {
    return (
      this.status === ProposalStatus.QUEUED &&
      this.earliestExecutionDate &&
      new Date(this.earliestExecutionDate) <= new Date() &&
      !this.executionTransactionHash
    );
  }

  get participationRate(): number {
    const totalVotesCasted =
      BigInt(this.votesFor) + BigInt(this.votesAgainst) + BigInt(this.votesAbstain);
    const totalEligiblePower = BigInt(this.totalVotingPower); // Snapshot power
    if (totalEligiblePower === BigInt(0)) return 0;
    return (Number(totalVotesCasted) / Number(totalEligiblePower)) * 100;
  }

  get approvalRate(): number {
    // Percentage of "FOR" votes among non-abstain votes
    const forVotes = BigInt(this.votesFor);
    const againstVotes = BigInt(this.votesAgainst);
    const totalEffectiveVotes = forVotes + againstVotes;
    if (totalEffectiveVotes === BigInt(0)) return 0;
    return (Number(forVotes) / Number(totalEffectiveVotes)) * 100;
  }

  get daysUntilVotingEnd(): number {
    if (!this.votingEndDate || this.status !== ProposalStatus.ACTIVE) return -1;
    const now = new Date();
    const endDate = new Date(this.votingEndDate);
    if (endDate <= now) return 0;
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilExecution(): number {
    if (!this.earliestExecutionDate || this.status !== ProposalStatus.QUEUED) return -1;
    const now = new Date();
    const execDate = new Date(this.earliestExecutionDate);
    if (execDate <= now) return 0;
    const diffTime = execDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

@Entity('votes')
export class Vote {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // No need for proposalId as a separate column if using ManyToOne correctly,
  // TypeORM will create proposal_id or similar.
  // We keep it if we want to query by proposalId without joining often, but it's redundant.
  // For this example, let's keep it for direct querying, but ensure it's consistent.
  @ApiProperty({ description: 'ID of the proposal this vote belongs to' })
  @Column('uuid')
  proposalId: string;

  @ApiProperty({ description: 'Voter wallet address' })
  @Column()
  voter: string;

  @ApiProperty({ description: 'Vote choice', enum: VoteChoice })
  @Column({
    type: 'enum',
    enum: VoteChoice,
  })
  choice: VoteChoice;

  @ApiProperty({ description: 'Voting power used for this vote' })
  @Column('decimal', { precision: 78, scale: 0 })
  votingPower: string;

  @ApiProperty({ description: 'Vote date' })
  @Column('timestamp')
  voteDate: Date;

  @ApiProperty({ description: 'Block number when voted' })
  @Column()
  blockNumber: string;

  @ApiProperty({ description: 'Transaction hash of the vote' })
  @Column()
  transactionHash: string;

  @ApiProperty({ description: 'Reason provided by the voter (optional)' })
  @Column('text', { nullable: true })
  reason?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ type: () => Proposal, description: 'The proposal this vote is for' })
  @ManyToOne(() => Proposal, proposal => proposal.votes, { onDelete: 'CASCADE' }) // Added onDelete for data integrity
  proposal: Proposal;
}
