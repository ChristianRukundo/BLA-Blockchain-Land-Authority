import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { ProposalStatus } from './entities/proposal.entity';


import {
  CreateProposalDto,
  UpdateProposalDto,
  VoteOnProposalDto,
  ExecuteProposalDto,
  ProposalListResponseDto,
  ProposalStatisticsDto,
  GovernanceStatisticsDto,
  CancelProposalDto,
  ProposalResponseDto,
  ProposalFilterDto,
  VotingPowerResponseDto,
  ProposalVotesResponseDto,
} from './dto/governance.dto';

@ApiTags('governance')
@Controller('governance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  @ApiOperation({ summary: 'Create a new governance proposal' })
  @ApiResponse({
    status: 201,
    description: 'Governance proposal created successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., validation error, on-chain creation failed)',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROPOSER)
  async createProposal(@Body() createProposalDto: CreateProposalDto): Promise<ProposalResponseDto> {
    try {
      return await this.governanceService.createProposal(createProposalDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to create governance proposal: ${(error as Error).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('proposals')
  @ApiOperation({ summary: 'Get all governance proposals with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Governance proposals retrieved successfully',
    type: ProposalListResponseDto,
  })
  async findAllProposals(@Query() filterDto: ProposalFilterDto): Promise<ProposalListResponseDto> {
    try {
      return await this.governanceService.findAll(filterDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to retrieve governance proposals: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get a specific governance proposal by its database ID' })
  @ApiResponse({
    status: 200,
    description: 'Governance proposal retrieved successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Governance proposal not found (by DB ID)' })
  async findProposalById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.governanceService.findOne(id);
    return this.governanceService.mapToResponseDto(proposal);
  }

  @Get('proposals/on-chain/:onChainId')
  @ApiOperation({ summary: 'Get a governance proposal by its on-chain ID' })
  @ApiResponse({
    status: 200,
    description: 'Governance proposal retrieved successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Governance proposal not found (by OnChain ID)' })
  async findProposalByOnChainId(
    @Param('onChainId') onChainId: string,
  ): Promise<ProposalResponseDto> {
    try {
      const proposal = await this.governanceService.findByOnChainId(onChainId);
      if (!proposal) {
        throw new HttpException(
          'Governance proposal not found for the given on-chain ID',
          HttpStatus.NOT_FOUND,
        );
      }
      return this.governanceService.mapToResponseDto(proposal);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to retrieve governance proposal by on-chain ID: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('proposals/:id')
  @ApiOperation({
    summary:
      'Update a governance proposal (limited fields, e.g., title, description if status allows)',
  })
  @ApiResponse({
    status: 200,
    description: 'Governance proposal updated successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., proposal not in updatable state)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateProposal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateProposalDto: UpdateProposalDto,
  ): Promise<ProposalResponseDto> {
    return await this.governanceService.update(id, updateProposalDto);
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Vote on an active governance proposal' })
  @ApiResponse({
    status: 200,
    description: 'Vote recorded successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., not active, already voted, voting ended, insufficient power)',
  })
  async voteOnProposal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() voteDto: VoteOnProposalDto,
  ): Promise<ProposalResponseDto> {
    return await this.governanceService.vote(id, voteDto);
  }

  @Post('proposals/:id/queue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DAO_EXECUTOR)
  @ApiOperation({ summary: 'Queue a succeeded governance proposal for execution (after timelock)' })
  @ApiResponse({
    status: 200,
    description: 'Proposal queued successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., proposal not succeeded or already queued)',
  })
  async queueProposal(@Param('id', new ParseUUIDPipe()) id: string): Promise<ProposalResponseDto> {
    return await this.governanceService.queue(id);
  }

  @Post('proposals/:id/execute')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DAO_EXECUTOR)
  @ApiOperation({ summary: 'Execute a queued governance proposal (after timelock delay)' })
  @ApiResponse({
    status: 200,
    description: 'Proposal execution initiated successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., not executable, timelock not passed, already executed)',
  })
  async executeProposal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() executeDto: ExecuteProposalDto,
  ): Promise<ProposalResponseDto> {
    return await this.governanceService.execute(id, executeDto);
  }

  @Post('proposals/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a governance proposal (if allowed by status and rules)' })
  @ApiResponse({
    status: 200,
    description: 'Proposal cancelled successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., proposal not cancellable)' })
  async cancelProposal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() cancelDto: CancelProposalDto,
  ): Promise<ProposalResponseDto> {
    return await this.governanceService.cancel(id, cancelDto);
  }

  @Post('proposals/update-statuses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SYSTEM)
  @ApiOperation({
    summary: 'Trigger system update of proposal statuses (e.g., Active to Succeeded/Defeated)',
  })
  @ApiResponse({ status: 200, description: 'Proposal statuses update process reported' })
  async updateProposalStatuses(): Promise<{ updated: number; message: string }> {
    try {
      const result = await this.governanceService.updateProposalStatuses();
      return { message: result.message, updated: result.updated };
    } catch (error) {
      throw new HttpException(
        `Failed to trigger proposal status updates: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/proposals')
  @ApiOperation({ summary: 'Get governance proposal statistics' })
  @ApiResponse({
    status: 200,
    description: 'Proposal statistics retrieved',
    type: ProposalStatisticsDto,
  })
  async getProposalStatistics(): Promise<ProposalStatisticsDto> {
    try {
      return await this.governanceService.getProposalStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get proposal statistics: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/governance')
  @ApiOperation({ summary: 'Get comprehensive DAO governance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Governance statistics retrieved',
    type: GovernanceStatisticsDto,
  })
  async getGovernanceStatistics(): Promise<GovernanceStatisticsDto> {
    try {
      return await this.governanceService.getGovernanceStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get governance statistics: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id/voting-power/:address')
  @ApiOperation({
    summary: 'Get voting power for an address on a specific proposal and check if voted',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting power and status retrieved',
    type: VotingPowerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async getVotingPower(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('address') address: string,
  ): Promise<VotingPowerResponseDto> {
    return await this.governanceService.getVotingPower(id, address);
  }

  @Get('proposals/:id/votes')
  @ApiOperation({ summary: 'Get all votes cast for a specific proposal' })
  @ApiResponse({
    status: 200,
    description: 'Proposal votes retrieved successfully',
    type: ProposalVotesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async getProposalVotes(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProposalVotesResponseDto> {
    try {
      const proposal = await this.governanceService.findOne(id);

      const totalVotesCastedBigInt =
        BigInt(proposal.votesFor) + BigInt(proposal.votesAgainst) + BigInt(proposal.votesAbstain);

      return {
        proposalId: proposal.id,
        onChainProposalId: proposal.proposalId,
        totalVotesCasted: totalVotesCastedBigInt.toString(),
        forVotesPower: proposal.votesFor,
        againstVotesPower: proposal.votesAgainst,
        abstainVotesPower: proposal.votesAbstain,
        votes: proposal.votes.map(vote => ({
          voter: vote.voter,
          choice: vote.choice,
          votingPower: vote.votingPower,
          reason: vote.reason,
          timestamp: vote.voteDate,
        })),
        voteCount: proposal.votes.length,
        quorumRequired: proposal.quorumRequired,
        quorumReached: proposal.quorumReached,
        thresholdReached: proposal.thresholdReached,
        votingThresholdPercent: proposal.votingThreshold,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to get proposal votes: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active-proposals')
  @ApiOperation({ summary: 'Get all active governance proposals (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Active proposals retrieved',
    type: ProposalListResponseDto,
  })
  async getActiveProposals(
    @Query() filterDto: ProposalFilterDto,
  ): Promise<ProposalListResponseDto> {
    try {
      const activeFilter: ProposalFilterDto = {
        ...filterDto,
        status: ProposalStatus.ACTIVE,
        limit: filterDto.limit || 100,
      };
      return await this.governanceService.findAll(activeFilter);
    } catch (error) {
      throw new HttpException(
        `Failed to get active proposals: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:address/proposals')
  @ApiOperation({ summary: 'Get proposals created by a specific user (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'User proposals retrieved',
    type: ProposalListResponseDto,
  })
  async getUserProposals(
    @Param('address') address: string,
    @Query() filterDto: ProposalFilterDto,
  ): Promise<ProposalListResponseDto> {
    try {
      const userProposalsFilter: ProposalFilterDto = {
        ...filterDto,
        proposer: address,
      };
      return await this.governanceService.findAll(userProposalsFilter);
    } catch (error) {
      throw new HttpException(
        `Failed to get user proposals for address ${address}: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
