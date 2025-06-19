import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { ProposalType, ProposalStatus } from './entities/proposal.entity';
import {
  CreateProposalDto,
  UpdateProposalDto,
  VoteOnProposalDto,
  ExecuteProposalDto,
  ProposalListResponseDto,
  ProposalStatisticsDto,
  GovernanceStatisticsDto,
} from './dto/governance.dto';

@ApiTags('governance')
@Controller('governance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  @ApiOperation({ summary: 'Create a new governance proposal' })
  @ApiResponse({ status: 201, description: 'Governance proposal created successfully' })
  async createProposal(@Body() createProposalDto: CreateProposalDto) {
    try {
      return await this.governanceService.createProposal(createProposalDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create governance proposal: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('proposals')
  @ApiOperation({ summary: 'Get all governance proposals with filtering' })
  @ApiResponse({ status: 200, description: 'Governance proposals retrieved successfully', type: ProposalListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'proposalType', required: false, enum: ProposalType, description: 'Filter by proposal type' })
  @ApiQuery({ name: 'status', required: false, enum: ProposalStatus, description: 'Filter by proposal status' })
  @ApiQuery({ name: 'proposer', required: false, type: String, description: 'Filter by proposer address' })
  async findAllProposals(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('proposalType') proposalType?: ProposalType,
    @Query('status') status?: ProposalStatus,
    @Query('proposer') proposer?: string,
  ) {
    try {
      return await this.governanceService.findAll(page, limit, proposalType, status, proposer);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve governance proposals: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get a governance proposal by ID' })
  @ApiResponse({ status: 200, description: 'Governance proposal retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async findProposalById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.governanceService.findOne(id);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve governance proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/on-chain/:onChainId')
  @ApiOperation({ summary: 'Get a governance proposal by on-chain ID' })
  @ApiResponse({ status: 200, description: 'Governance proposal retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async findProposalByOnChainId(@Param('onChainId') onChainId: string) {
    try {
      const proposal = await this.governanceService.findByOnChainId(onChainId);
      if (!proposal) {
        throw new HttpException('Governance proposal not found', HttpStatus.NOT_FOUND);
      }
      return proposal;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve governance proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('proposals/:id')
  @ApiOperation({ summary: 'Update a governance proposal' })
  @ApiResponse({ status: 200, description: 'Governance proposal updated successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async updateProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProposalDto: UpdateProposalDto,
  ) {
    try {
      return await this.governanceService.update(id, updateProposalDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update governance proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Vote on a governance proposal' })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async voteOnProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() voteDto: VoteOnProposalDto,
  ) {
    try {
      return await this.governanceService.vote(id, voteDto);
    } catch (error) {
      throw new HttpException(
        `Failed to vote on proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals/:id/execute')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DAO_EXECUTOR)
  @ApiOperation({ summary: 'Execute a governance proposal' })
  @ApiResponse({ status: 200, description: 'Proposal executed successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async executeProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() executeDto: ExecuteProposalDto,
  ) {
    try {
      return await this.governanceService.execute(id, executeDto);
    } catch (error) {
      throw new HttpException(
        `Failed to execute proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a governance proposal' })
  @ApiResponse({ status: 200, description: 'Proposal cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Governance proposal not found' })
  async cancelProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelData: { cancelledBy: string; reason: string },
  ) {
    try {
      return await this.governanceService.cancel(id, cancelData.cancelledBy, cancelData.reason);
    } catch (error) {
      throw new HttpException(
        `Failed to cancel proposal: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('proposals/update-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SYSTEM)
  @ApiOperation({ summary: 'Update proposal statuses (system operation)' })
  @ApiResponse({ status: 200, description: 'Proposal statuses updated successfully' })
  async updateProposalStatuses() {
    try {
      await this.governanceService.updateProposalStatus();
      return { message: 'Proposal statuses updated successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to update proposal statuses: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/proposals')
  @ApiOperation({ summary: 'Get governance proposal statistics' })
  @ApiResponse({ status: 200, description: 'Proposal statistics retrieved successfully', type: ProposalStatisticsDto })
  async getProposalStatistics() {
    try {
      return await this.governanceService.getProposalStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get proposal statistics: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/governance')
  @ApiOperation({ summary: 'Get comprehensive governance statistics' })
  @ApiResponse({ status: 200, description: 'Governance statistics retrieved successfully', type: GovernanceStatisticsDto })
  async getGovernanceStatistics() {
    try {
      return await this.governanceService.getGovernanceStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get governance statistics: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id/voting-power/:address')
  @ApiOperation({ summary: 'Get voting power for an address on a specific proposal' })
  @ApiResponse({ status: 200, description: 'Voting power retrieved successfully' })
  async getVotingPower(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('address') address: string,
  ) {
    try {
      // This would typically call the blockchain service to get voting power
      // For now, we'll return a placeholder
      return {
        proposalId: id,
        address,
        votingPower: 0,
        hasVoted: false,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get voting power: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('proposals/:id/votes')
  @ApiOperation({ summary: 'Get all votes for a proposal' })
  @ApiResponse({ status: 200, description: 'Proposal votes retrieved successfully' })
  async getProposalVotes(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const proposal = await this.governanceService.findOne(id);
      
      return {
        proposalId: id,
        totalVotes: proposal.forVotes + proposal.againstVotes + proposal.abstainVotes,
        forVotes: proposal.forVotes,
        againstVotes: proposal.againstVotes,
        abstainVotes: proposal.abstainVotes,
        voters: proposal.voters,
        quorumRequired: proposal.quorumRequired,
        quorumMet: (proposal.forVotes + proposal.againstVotes + proposal.abstainVotes) >= (proposal.quorumRequired || 0),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get proposal votes: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active-proposals')
  @ApiOperation({ summary: 'Get all active governance proposals' })
  @ApiResponse({ status: 200, description: 'Active proposals retrieved successfully' })
  async getActiveProposals() {
    try {
      return await this.governanceService.findAll(1, 100, undefined, ProposalStatus.ACTIVE);
    } catch (error) {
      throw new HttpException(
        `Failed to get active proposals: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:address/proposals')
  @ApiOperation({ summary: 'Get proposals created by a specific user' })
  @ApiResponse({ status: 200, description: 'User proposals retrieved successfully' })
  async getUserProposals(
    @Param('address') address: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    try {
      return await this.governanceService.findAll(page, limit, undefined, undefined, address);
    } catch (error) {
      throw new HttpException(
        `Failed to get user proposals: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
