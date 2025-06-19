import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
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
  @Column()
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
  values: string[];

  @ApiProperty({ description: 'Function signatures to call' })
  @Column('simple-array')
  signatures: string[];

  @ApiProperty({ description: 'Encoded call data' })
  @Column('simple-array')
  calldatas: string[];

  @ApiProperty({ description: 'Proposal creation date' })
  @Column('timestamp')
  createdDate: Date;

  @ApiProperty({ description: 'Block number when created' })
  @Column()
  createdBlock: string;

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

  @ApiProperty({ description: 'Votes for the proposal' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesFor: string;

  @ApiProperty({ description: 'Votes against the proposal' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesAgainst: string;

  @ApiProperty({ description: 'Abstain votes' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  votesAbstain: string;

  @ApiProperty({ description: 'Total voting power at proposal creation' })
  @Column('decimal', { precision: 78, scale: 0, default: '0' })
  totalVotingPower: string;

  @ApiProperty({ description: 'Quorum required for proposal' })
  @Column('decimal', { precision: 78, scale: 0 })
  quorumRequired: string;

  @ApiProperty({ description: 'Voting threshold percentage' })
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

  @ApiProperty({ description: 'Earliest execution date' })
  @Column('timestamp', { nullable: true })
  earliestExecutionDate?: Date;

  @ApiProperty({ description: 'Date when proposal was executed' })
  @Column('timestamp', { nullable: true })
  executedDate?: Date;

  @ApiProperty({ description: 'Execution transaction hash' })
  @Column({ nullable: true })
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Proposal expiration date' })
  @Column('timestamp', { nullable: true })
  expirationDate?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  @Column('text', { nullable: true })
  cancellationReason?: string;

  @ApiProperty({ description: 'Additional metadata' })
  @Column('jsonb', { nullable: true })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];

  // Computed properties
  get canVote(): boolean {
    return this.status === ProposalStatus.ACTIVE && 
           this.votingEndDate && 
           new Date(this.votingEndDate) > new Date();
  }

  get canQueue(): boolean {
    return this.status === ProposalStatus.SUCCEEDED && !this.queuedDate;
  }

  get canExecute(): boolean {
    return this.status === ProposalStatus.QUEUED && 
           this.earliestExecutionDate && 
           new Date(this.earliestExecutionDate) <= new Date() &&
           !this.executionTransactionHash;
  }

  get participationRate(): number {
    const totalVotes = parseFloat(this.votesFor) + 
                      parseFloat(this.votesAgainst) + 
                      parseFloat(this.votesAbstain);
    const totalPower = parseFloat(this.totalVotingPower);
    return totalPower > 0 ? (totalVotes / totalPower) * 100 : 0;
  }

  get approvalRate(): number {
    const forVotes = parseFloat(this.votesFor);
    const totalVotes = parseFloat(this.votesFor) + 
                      parseFloat(this.votesAgainst) + 
                      parseFloat(this.votesAbstain);
    return totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;
  }

  get daysUntilVotingEnd(): number {
    if (!this.votingEndDate) return -1;
    const now = new Date();
    const endDate = new Date(this.votingEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get daysUntilExecution(): number {
    if (!this.earliestExecutionDate) return -1;
    const now = new Date();
    const execDate = new Date(this.earliestExecutionDate);
    const diffTime = execDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

@Entity('votes')
export class Vote {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Proposal ID' })
  @Column()
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

  @ApiProperty({ description: 'Voting power used' })
  @Column('decimal', { precision: 78, scale: 0 })
  votingPower: string;

  @ApiProperty({ description: 'Vote date' })
  @Column('timestamp')
  voteDate: Date;

  @ApiProperty({ description: 'Block number when voted' })
  @Column()
  blockNumber: string;

  @ApiProperty({ description: 'Transaction hash' })
  @Column()
  transactionHash: string;

  @ApiProperty({ description: 'Vote reason' })
  @Column('text', { nullable: true })
  reason?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ type: () => Proposal })
  proposal: Proposal;
}

