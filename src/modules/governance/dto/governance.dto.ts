import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsArray,
  IsEthereumAddress,
  IsNumber,
  Length,
  Min,
  Max,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProposalStatus, ProposalType, VoteChoice } from '../entities/proposal.entity';

export class CreateProposalDto {
  @ApiProperty({ description: 'On-chain proposal ID' })
  @IsString()
  proposalId: string;

  @ApiProperty({ description: 'Proposal type', enum: ProposalType })
  @IsEnum(ProposalType)
  proposalType: ProposalType;

  @ApiProperty({
    description: 'Address of the proposer',
    example: '0x742d35Cc6634C0532925a3b8D4C9db96',
  })
  @IsEthereumAddress()
  proposer: string;

  @ApiProperty({ description: 'Proposal title', example: 'Increase compliance fine threshold' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ description: 'Brief description of the proposal' })
  @IsString()
  @Length(20, 2000)
  description: string;

  @ApiProperty({ description: 'IPFS hash of detailed proposal document', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  detailsHash?: string;

  @ApiProperty({ description: 'Target contract addresses for execution', type: [String] })
  @IsArray()
  @IsEthereumAddress({ each: true })
  targets: string[];

  @ApiProperty({ description: 'Values to send with calls', type: [String] })
  @IsArray()
  @IsString({ each: true })
  values: string[];

  @ApiProperty({ description: 'Function signatures to call', type: [String] })
  @IsArray()
  @IsString({ each: true })
  signatures: string[];

  @ApiProperty({ description: 'Encoded call data', type: [String] })
  @IsArray()
  @IsString({ each: true })
  calldatas: string[];

  @ApiProperty({ description: 'Date when proposal was created', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  createdDate: string;

  @ApiProperty({ description: 'Block number when proposal was created' })
  @IsString()
  createdBlock: string;

  @ApiProperty({ description: 'Voting start date', required: false })
  @IsOptional()
  @IsDateString()
  votingStartDate?: string;

  @ApiProperty({ description: 'Voting end date', required: false })
  @IsOptional()
  @IsDateString()
  votingEndDate?: string;

  @ApiProperty({ description: 'Block number when voting starts', required: false })
  @IsOptional()
  @IsString()
  votingStartBlock?: string;

  @ApiProperty({ description: 'Block number when voting ends', required: false })
  @IsOptional()
  @IsString()
  votingEndBlock?: string;

  @ApiProperty({ description: 'Quorum required for proposal' })
  @IsString()
  quorumRequired: string;

  @ApiProperty({ description: 'Voting threshold required', required: false, default: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  votingThreshold?: number;

  @ApiProperty({ description: 'Timelock delay before execution', required: false, default: 172800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timelockDelay?: number;

  @ApiProperty({ description: 'Date when proposal expires', required: false })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateProposalDto {
  @ApiProperty({ description: 'Proposal status', enum: ProposalStatus, required: false })
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @ApiProperty({ description: 'IPFS hash of detailed proposal document', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  detailsHash?: string;

  @ApiProperty({ description: 'Voting start date', required: false })
  @IsOptional()
  @IsDateString()
  votingStartDate?: string;

  @ApiProperty({ description: 'Voting end date', required: false })
  @IsOptional()
  @IsDateString()
  votingEndDate?: string;

  @ApiProperty({ description: 'Block number when voting starts', required: false })
  @IsOptional()
  @IsString()
  votingStartBlock?: string;

  @ApiProperty({ description: 'Block number when voting ends', required: false })
  @IsOptional()
  @IsString()
  votingEndBlock?: string;

  @ApiProperty({ description: 'Total votes for', required: false })
  @IsOptional()
  @IsString()
  votesFor?: string;

  @ApiProperty({ description: 'Total votes against', required: false })
  @IsOptional()
  @IsString()
  votesAgainst?: string;

  @ApiProperty({ description: 'Total abstain votes', required: false })
  @IsOptional()
  @IsString()
  votesAbstain?: string;

  @ApiProperty({ description: 'Total voting power at snapshot', required: false })
  @IsOptional()
  @IsString()
  totalVotingPower?: string;

  @ApiProperty({ description: 'Whether quorum was reached', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  quorumReached?: boolean;

  @ApiProperty({ description: 'Whether proposal passed voting threshold', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  thresholdReached?: boolean;

  @ApiProperty({ description: 'Date when proposal was queued for execution', required: false })
  @IsOptional()
  @IsDateString()
  queuedDate?: string;

  @ApiProperty({ description: 'Earliest execution date', required: false })
  @IsOptional()
  @IsDateString()
  earliestExecutionDate?: string;

  @ApiProperty({ description: 'Date when proposal was executed', required: false })
  @IsOptional()
  @IsDateString()
  executedDate?: string;

  @ApiProperty({ description: 'Transaction hash of execution', required: false })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  executionTransactionHash?: string;

  @ApiProperty({ description: 'Reason for cancellation if applicable', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  cancellationReason?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ProposalFilterDto {
  @ApiProperty({ description: 'Filter by proposer address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  proposer?: string;

  @ApiProperty({ description: 'Filter by proposal type', enum: ProposalType, required: false })
  @IsOptional()
  @IsEnum(ProposalType)
  proposalType?: ProposalType;

  @ApiProperty({ description: 'Filter by status', enum: ProposalStatus, required: false })
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @ApiProperty({ description: 'Filter by created date from', required: false })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @ApiProperty({ description: 'Filter by created date to', required: false })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @ApiProperty({ description: 'Filter by active proposals only', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean;

  @ApiProperty({ description: 'Filter by executable proposals only', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  executableOnly?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdDate';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class CreateVoteDto {
  @ApiProperty({ description: 'Proposal ID' })
  @IsString()
  proposalId: string;

  @ApiProperty({ description: 'Voter address', example: '0x742d35Cc6634C0532925a3b8D4C9db96' })
  @IsEthereumAddress()
  voter: string;

  @ApiProperty({ description: 'Vote choice', enum: VoteChoice })
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @ApiProperty({ description: 'Voting power used' })
  @IsString()
  votingPower: string;

  @ApiProperty({ description: 'Date when vote was cast', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  voteDate: string;

  @ApiProperty({ description: 'Block number when vote was cast' })
  @IsString()
  blockNumber: string;

  @ApiProperty({ description: 'Transaction hash of the vote' })
  @IsString()
  @Length(66, 66)
  transactionHash: string;

  @ApiProperty({ description: 'Reason for the vote', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reason?: string;
}

export class VoteFilterDto {
  @ApiProperty({ description: 'Filter by proposal ID', required: false })
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiProperty({ description: 'Filter by voter address', required: false })
  @IsOptional()
  @IsEthereumAddress()
  voter?: string;

  @ApiProperty({ description: 'Filter by vote choice', enum: VoteChoice, required: false })
  @IsOptional()
  @IsEnum(VoteChoice)
  choice?: VoteChoice;

  @ApiProperty({ description: 'Filter by vote date from', required: false })
  @IsOptional()
  @IsDateString()
  voteDateFrom?: string;

  @ApiProperty({ description: 'Filter by vote date to', required: false })
  @IsOptional()
  @IsDateString()
  voteDateTo?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Sort field', required: false, default: 'voteDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'voteDate';

  @ApiProperty({ description: 'Sort order', required: false, default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ExecuteProposalDto {
  @ApiProperty({ description: 'Transaction hash of execution' })
  @IsString()
  @Length(66, 66)
  executionTransactionHash: string;

  @ApiProperty({ description: 'Additional execution notes', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class QueueProposalDto {
  @ApiProperty({ description: 'Date when proposal was queued', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  queuedDate: string;

  @ApiProperty({ description: 'Earliest execution date', example: '2024-01-17T10:00:00Z' })
  @IsDateString()
  earliestExecutionDate: string;
}

export class VoteOnProposalDto {
  @ApiProperty({ description: 'Voter address' })
  @IsEthereumAddress()
  voter: string;

  @ApiProperty({ description: 'Vote support', enum: ['FOR', 'AGAINST', 'ABSTAIN'] })
  @IsEnum(['FOR', 'AGAINST', 'ABSTAIN'])
  support: 'FOR' | 'AGAINST' | 'ABSTAIN';

  @ApiProperty({ description: 'Voting power amount' })
  @IsNumber()
  @Min(0)
  votingPower: number;

  @ApiProperty({ description: 'Reason for vote', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reason?: string;
}

export class ProposalResponseDto {
  @ApiProperty({ description: 'Proposal ID' })
  id: string;

  @ApiProperty({ description: 'On-chain proposal ID' })
  onChainProposalId: string;

  @ApiProperty({ description: 'Proposal type', enum: ProposalType })
  proposalType: ProposalType;

  @ApiProperty({ description: 'Proposal status', enum: ProposalStatus })
  status: ProposalStatus;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Proposal description' })
  description: string;

  @ApiProperty({ description: 'Proposer address' })
  proposer: string;

  @ApiProperty({ description: 'Votes for the proposal' })
  forVotes: string;

  @ApiProperty({ description: 'Votes against the proposal' })
  againstVotes: string;

  @ApiProperty({ description: 'Abstain votes' })
  abstainVotes: string;

  @ApiProperty({ description: 'Quorum required for proposal' })
  quorumRequired: string;

  @ApiProperty({ description: 'Voting end time' })
  votingEndTime: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Execution timestamp', required: false })
  executedAt?: Date;

  @ApiProperty({ description: 'Executed by address', required: false })
  executedBy?: string;

  @ApiProperty({ description: 'Execution transaction hash', required: false })
  executionTxHash?: string;
}

export class ProposalListResponseDto {
  @ApiProperty({ description: 'List of proposals', type: [ProposalResponseDto] })
  proposals: ProposalResponseDto[];

  @ApiProperty({ description: 'Total number of proposals matching the filter' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}

export class ProposalStatisticsDto {
  @ApiProperty({ description: 'Total number of proposals' })
  totalProposals: number;

  @ApiProperty({ description: 'Proposals by status' })
  proposalsByStatus: Record<ProposalStatus, number>;

  @ApiProperty({ description: 'Proposals by type' })
  proposalsByType: Record<ProposalType, number>;

  @ApiProperty({ description: 'Number of proposals in the last 30 days' })
  recentProposals: number;
}

export class GovernanceStatisticsDto extends ProposalStatisticsDto {
  @ApiProperty({ description: 'Number of active proposals' })
  activeProposals: number;

  @ApiProperty({ description: 'Total number of unique voters' })
  totalVoters: number;

  @ApiProperty({ description: 'Total voting power used' })
  totalVotingPower: number;

  @ApiProperty({ description: 'Average participation rate per proposal' })
  averageParticipation: number;
}

export class DelegateVotingPowerDto {
  @ApiProperty({ description: 'Delegator address' })
  @IsEthereumAddress()
  delegator: string;

  @ApiProperty({ description: 'Delegate address' })
  @IsEthereumAddress()
  delegate: string;

  @ApiProperty({ description: 'Amount of voting power to delegate' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Expiration date of delegation', required: false })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class CancelProposalDto {
  @ApiProperty({ description: 'Address of the canceller' })
  @IsEthereumAddress()
  cancelledBy: string;

  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @Length(10, 1000)
  reason: string;
}
