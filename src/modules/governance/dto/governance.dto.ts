import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDate,
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
  ArrayNotEmpty,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProposalStatus, ProposalType, VoteChoice } from '../entities/proposal.entity';



export class CreateProposalDto {
  @ApiPropertyOptional({ description: 'On-chain proposal ID (if known, otherwise backend will generate/retrieve)' })
  @IsOptional()
  @IsString()
  @Length(1, 255) 
  proposalId?: string;

  @ApiProperty({ description: 'Proposal type', enum: ProposalType })
  @IsEnum(ProposalType)
  proposalType: ProposalType;

  @ApiProperty({
    description: 'Address of the proposer',
    example: '0x123...',
  })
  @IsEthereumAddress()
  proposer: string;

  @ApiProperty({ description: 'Proposal title', example: 'Increase compliance fine threshold' })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the proposal' })
  @IsString()
  @Length(20, 5000)
  description: string;

  

  @ApiProperty({ description: 'Target contract addresses for execution', type: [String], example: ['0xabc...'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEthereumAddress({ each: true })
  targets: string[];

  @ApiProperty({ description: 'ETH values (in wei, as strings) to send with calls', type: [String], example: ['0'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true }) 
  values: string[];

  @ApiProperty({ description: 'Function signatures to call', type: [String], example: ['transfer(address,uint256)'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  signatures: string[];

  @ApiProperty({ description: 'Encoded call data for each function call', type: [String], example: ['0xa9059cbb...'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  calldatas: string[];

  @ApiPropertyOptional({ description: 'Voting end date (ISO string)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  votingEndDate?: string; 

  @ApiPropertyOptional({ description: 'Quorum required (as string for large numbers)', example: '1000000000000000000000' })
  @IsOptional()
  @IsString()
  quorumRequired?: string; 

  @ApiPropertyOptional({ description: 'Voting threshold percentage (e.g., 50.1 for >50.1%)', default: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  votingThreshold?: number;

  @ApiPropertyOptional({ description: 'Timelock delay in seconds before execution (if applicable)', default: 172800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timelockDelay?: number;

  @ApiPropertyOptional({ description: 'Date when proposal expires (if applicable)', example: '2025-01-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata as a JSON object' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateProposalDto {
  
  @ApiPropertyOptional({ description: 'Proposal title' })
  @IsOptional()
  @IsString()
  @Length(5, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Proposal description' })
  @IsOptional()
  @IsString()
  @Length(20, 5000)
  description?: string;

  

  @ApiPropertyOptional({ description: 'Voting end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  votingEndDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class VoteOnProposalDto {
  @ApiProperty({ description: 'Voter address (could also be derived from JWT)' })
  @IsEthereumAddress()
  voter: string;

  @ApiProperty({ description: 'Vote choice', enum: VoteChoice })
  @IsEnum(VoteChoice)
  choice: VoteChoice; 

  @ApiProperty({ description: 'Voting power amount (as string for large numbers)' })
  @IsString() 
  votingPower: string;

  @ApiPropertyOptional({ description: 'Reason for vote' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reason?: string;
}

export class ExecuteProposalDto {
  @ApiPropertyOptional({ description: 'Address of the executor (if relevant for record-keeping)' })
  @IsOptional()
  @IsEthereumAddress()
  executorAddress?: string;

  
  @ApiPropertyOptional({ description: 'Transaction hash if execution was done externally and being recorded' })
  @IsOptional()
  @IsString()
  @Length(66, 66)
  executionTransactionHash?: string;


  @ApiPropertyOptional({ description: 'Additional execution notes' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class CancelProposalDto {
  @ApiProperty({ description: 'Address of the user/entity cancelling the proposal' })
  @IsEthereumAddress()
  cancelledBy: string; 

  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 1000)
  reason: string;
}





export class ProposalFilterDto {
  @ApiPropertyOptional({ description: 'Filter by proposer address' })
  @IsOptional()
  @IsEthereumAddress()
  proposer?: string;

  @ApiPropertyOptional({ description: 'Filter by proposal type', enum: ProposalType })
  @IsOptional()
  @IsEnum(ProposalType)
  proposalType?: ProposalType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ProposalStatus })
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  
  @ApiPropertyOptional({ description: 'Filter by created date from (ISO string)' })
  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by created date to (ISO string)' })
  @IsOptional()
  @IsDateString()
  createdDateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field (e.g., "createdAt", "votingEndDate", "title")' , default: 'createdAt'})
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}




export class ProposalResponseDto {
  @ApiProperty({ description: 'Database ID of the proposal', type: String, format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ description: 'On-chain proposal ID' })
  onChainProposalId?: string;

  @ApiProperty({ description: 'Proposal type', enum: ProposalType })
  proposalType: ProposalType;

  @ApiProperty({ description: 'Proposal status', enum: ProposalStatus })
  status: ProposalStatus;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Full proposal description' })
  description: string;

  @ApiPropertyOptional({ description: 'IPFS hash of detailed proposal content' })
  detailsHash?: string;

  @ApiProperty({ description: 'Address of the proposer' })
  proposer: string;

  @ApiProperty({ description: 'Target contract addresses for execution', type: [String] })
  targets: string[];

  @ApiProperty({ description: 'ETH values (in wei, as strings) to send with calls', type: [String] })
  values: string[];

  @ApiProperty({ description: 'Function signatures to call', type: [String] })
  signatures: string[];

  @ApiProperty({ description: 'Encoded call data for each function call', type: [String] })
  calldatas: string[];

  @ApiProperty({ description: 'Sum of "FOR" voting power (as string)' })
  votesFor: string;

  @ApiProperty({ description: 'Sum of "AGAINST" voting power (as string)' })
  votesAgainst: string;

  @ApiProperty({ description: 'Sum of "ABSTAIN" voting power (as string)' })
  votesAbstain: string;

  @ApiProperty({ description: 'Quorum of voting power required (as string)' })
  quorumRequired: string;

  @ApiProperty({ description: 'Indicates if quorum has been met' })
  quorumReached: boolean;

  @ApiProperty({ description: 'Indicates if the proposal met its voting threshold for passing' })
  thresholdReached: boolean;

  @ApiProperty({ description: 'Voting threshold percentage (e.g., 50.0 for >50%)' })
  votingThreshold: number;

  @ApiPropertyOptional({ description: 'Total voting power snapshotted when the proposal became active (as string)' })
  totalVotingPowerAtSnapshot?: string;

  @ApiPropertyOptional({ description: 'Voting start date (ISO string)' })
  @Type(() => Date)
  votingStartDate?: Date;

  @ApiPropertyOptional({ description: 'Voting end date (ISO string)' })
  @Type(() => Date)
  votingEndDate?: Date; 

  @ApiPropertyOptional({ description: 'Date proposal was queued for execution (ISO string)' })
  @Type(() => Date)
  queuedDate?: Date;

  @ApiPropertyOptional({ description: 'Date proposal was executed (ISO string)' })
  @Type(() => Date)
  executedDate?: Date; 

  @ApiPropertyOptional({ description: 'Earliest date the proposal can be executed after queuing (ISO string)' })
  @Type(() => Date)
  earliestExecutionDate?: Date;

  @ApiPropertyOptional({ description: 'Transaction hash of the execution' })
  executionTransactionHash?: string; 

  @ApiPropertyOptional({ description: 'Reason for cancellation, if applicable' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON object)' })
  metadata?: any;

  @ApiProperty({ description: 'Proposal creation timestamp (ISO string)' })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Proposal last update timestamp (ISO string)' })
  @Type(() => Date)
  updatedAt: Date;

  
  @ApiProperty({ description: 'Whether the proposal is currently open for voting' })
  canVote: boolean;

  @ApiProperty({ description: 'Whether the proposal can be queued for execution' })
  canQueue: boolean;

  @ApiProperty({ description: 'Whether the proposal can be executed now' })
  canExecute: boolean;
}

export class ProposalListResponseDto {
  @ApiProperty({ type: [ProposalResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => ProposalResponseDto)
  proposals: ProposalResponseDto[];

  @ApiProperty({ description: 'Total number of proposals matching filters' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}

export class ProposalStatisticsDto {
  @ApiProperty()
  totalProposals: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' }})
  proposalsByStatus: Record<ProposalStatus, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' }})
  proposalsByType: Record<ProposalType, number>;

  @ApiProperty()
  recentProposals: number; 
}

export class GovernanceStatisticsDto extends ProposalStatisticsDto {
  @ApiProperty({ description: 'Number of currently active proposals' })
  activeProposalsCount: number; 

  @ApiProperty({ description: 'Total number of unique voters across active proposals' })
  totalUniqueVotersInActiveProposals: number; 

  @ApiProperty({ description: 'Total voting power cast across active proposals (as string)' })
  totalCastVotingPowerInActiveProposals: string; 

  @ApiPropertyOptional({ description: 'Average participation rate (definition may vary)' })
  averageParticipation?: number;
}


export class VotingPowerResponseDto {
  @ApiProperty()
  proposalId: string; 

  @ApiPropertyOptional()
  onChainProposalId?: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ description: 'Voting power of the address for this proposal (as string)'})
  votingPower: string;

  @ApiProperty()
  hasVoted: boolean;
}


export class VoteDetailDto {
  @ApiProperty()
  voter: string;

  @ApiProperty({ enum: VoteChoice })
  choice: VoteChoice;

  @ApiProperty({ description: 'Voting power cast in this vote (as string)'})
  votingPower: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  @Type(() => Date)
  timestamp: Date;
}


export class ProposalVotesResponseDto {
  @ApiProperty()
  proposalId: string; 

  @ApiPropertyOptional()
  onChainProposalId?: string;

  @ApiProperty({ description: 'Total voting power cast on this proposal (as string)'})
  totalVotesCasted: string;

  @ApiProperty({ description: 'Total "FOR" voting power (as string)'})
  forVotesPower: string;

  @ApiProperty({ description: 'Total "AGAINST" voting power (as string)'})
  againstVotesPower: string;

  @ApiProperty({ description: 'Total "ABSTAIN" voting power (as string)'})
  abstainVotesPower: string;

  @ApiProperty({ type: [VoteDetailDto] })
  @ValidateNested({ each: true })
  @Type(() => VoteDetailDto)
  votes: VoteDetailDto[];

  @ApiProperty({ description: 'Number of unique votes/voters' })
  voteCount: number;

  @ApiProperty({ description: 'Quorum required for this proposal (as string)'})
  quorumRequired: string;

  @ApiProperty()
  quorumReached: boolean;

  @ApiProperty()
  thresholdReached: boolean;

  @ApiProperty({ description: 'Voting threshold percentage required for passing' })
  votingThresholdPercent: number;
}






export class CreateVoteDto { /* ... as originally provided ... */
  @ApiProperty({ description: 'Proposal ID (DB or OnChain)' })
  @IsString()
  proposalId: string;

  @ApiProperty({ description: 'Voter address' })
  @IsEthereumAddress()
  voter: string;

  @ApiProperty({ description: 'Vote choice', enum: VoteChoice })
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @ApiProperty({ description: 'Voting power used (as string)' })
  @IsString()
  votingPower: string;

  @ApiProperty({ description: 'Date when vote was cast' })
  @IsDateString()
  voteDate: string;

  @ApiProperty({ description: 'Block number when vote was cast' })
  @IsString()
  blockNumber: string;

  @ApiProperty({ description: 'Transaction hash of the vote' })
  @IsString()
  @Length(66, 66)
  transactionHash: string;

  @ApiPropertyOptional({ description: 'Reason for the vote' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reason?: string;
}

export class QueueProposalDto { /* ... as originally provided ... */
  @ApiProperty({ description: 'Date when proposal was queued' })
  @IsDateString()
  queuedDate: string;

  @ApiProperty({ description: 'Earliest execution date' })
  @IsDateString()
  earliestExecutionDate: string;
}

export class DelegateVotingPowerDto { /* ... as originally provided ... */
  @ApiProperty({ description: 'Delegator address' })
  @IsEthereumAddress()
  delegator: string;

  @ApiProperty({ description: 'Delegate address' })
  @IsEthereumAddress()
  delegate: string;

  @ApiProperty({ description: 'Amount of voting power to delegate (as string)' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ description: 'Expiration date of delegation' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class VoteFilterDto { /* ... as originally provided, for potential future use ... */
  @ApiPropertyOptional({ description: 'Filter by proposal ID (DB or OnChain)' })
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiPropertyOptional({ description: 'Filter by voter address' })
  @IsOptional()
  @IsEthereumAddress()
  voter?: string;

  @ApiPropertyOptional({ description: 'Filter by vote choice', enum: VoteChoice })
  @IsOptional()
  @IsEnum(VoteChoice)
  choice?: VoteChoice;

  @ApiPropertyOptional({ description: 'Filter by vote date from (ISO string)' })
  @IsOptional()
  @IsDateString()
  voteDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by vote date to (ISO string)' })
  @IsOptional()
  @IsDateString()
  voteDateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field', default: 'voteDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'voteDate';

  @ApiPropertyOptional({ description: 'Sort order', enum:['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}