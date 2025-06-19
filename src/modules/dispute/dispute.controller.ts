import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeFilterDto,
  SubmitEvidenceDto,
  SubmitToKlerosDto,
  ExecuteRulingDto,
  AppealDisputeDto,
} from './dto/dispute.dto';
import { Dispute, DisputeEvidence } from './entities/dispute.entity';

@ApiTags('Dispute Resolution')
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiOperation({ summary: 'Create new dispute' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dispute created successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or active dispute exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Land parcel not found',
  })
  async createDispute(
    @Body(ValidationPipe) dto: CreateDisputeDto,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.createDispute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all disputes with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disputes retrieved successfully',
  })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID' })
  @ApiQuery({ name: 'disputeType', required: false, description: 'Filter by dispute type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query(ValidationPipe) filters: DisputeFilterDto) {
    return this.disputeService.findAll(filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get dispute statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute statistics retrieved successfully',
  })
  async getStatistics() {
    return this.disputeService.getDisputeStatistics();
  }

  @Get('active')
  @Roles('ADMIN', 'DISPUTE_RESOLVER')
  @ApiOperation({ summary: 'Get active disputes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active disputes retrieved successfully',
  })
  async getActiveDisputes(): Promise<Dispute[]> {
    return this.disputeService.getActiveDisputes();
  }

  @Get('my-disputes')
  @ApiOperation({ summary: 'Get current user disputes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User disputes retrieved successfully',
  })
  async getMyDisputes(@CurrentUser() user: User): Promise<Dispute[]> {
    return this.disputeService.findByUser(user.walletAddress);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute retrieved successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Dispute> {
    return this.disputeService.findOne(id);
  }

  @Get('parcels/:parcelId')
  @ApiOperation({ summary: 'Get all disputes for a specific parcel' })
  @ApiParam({ name: 'parcelId', description: 'Land parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parcel disputes retrieved successfully',
  })
  async findByParcel(@Param('parcelId', ParseUUIDPipe) parcelId: string): Promise<Dispute[]> {
    return this.disputeService.findByParcel(parcelId);
  }

  @Put(':id')
  @Roles('ADMIN', 'DISPUTE_RESOLVER')
  @ApiOperation({ summary: 'Update dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute updated successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateDisputeDto,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.update(id, dto);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Submit evidence for dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Evidence submitted successfully',
    type: DisputeEvidence,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Evidence submission not allowed or user not authorized',
  })
  async submitEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: SubmitEvidenceDto,
    @CurrentUser() user: User,
  ): Promise<DisputeEvidence> {
    return this.disputeService.submitEvidence(id, user.walletAddress, dto);
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'Get all evidence for dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evidence retrieved successfully',
  })
  async getEvidence(@Param('id', ParseUUIDPipe) id: string): Promise<DisputeEvidence[]> {
    return this.disputeService.getEvidence(id);
  }

  @Post(':id/submit-to-kleros')
  @Roles('ADMIN', 'DISPUTE_RESOLVER')
  @ApiOperation({ summary: 'Submit dispute to Kleros for arbitration' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute submitted to Kleros successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dispute not ready for Kleros submission',
  })
  async submitToKleros(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: SubmitToKlerosDto,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.submitToKleros(id, dto);
  }

  @Post(':id/execute-ruling')
  @Roles('ADMIN', 'DISPUTE_RESOLVER')
  @ApiOperation({ summary: 'Execute Kleros ruling' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ruling executed successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ruling cannot be executed',
  })
  async executeRuling(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ExecuteRulingDto,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.executeRuling(id, dto);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Appeal dispute ruling' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute appealed successfully',
    type: Dispute,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dispute cannot be appealed or user not authorized',
  })
  async appealDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: AppealDisputeDto,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.appealDispute(id, user.walletAddress, dto);
  }

  @Put(':id/cancel')
  @Roles('ADMIN', 'DISPUTE_RESOLVER')
  @ApiOperation({ summary: 'Cancel dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute cancelled successfully',
    type: Dispute,
  })
  async cancelDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ): Promise<Dispute> {
    return this.disputeService.cancelDispute(id, reason);
  }

  // Webhook endpoint for Kleros updates (should be protected in production)
  @Post('kleros-webhook')
  @ApiOperation({ summary: 'Handle Kleros webhook updates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleKlerosWebhook(@Body() webhookData: any): Promise<void> {
    const { disputeId, ...updateData } = webhookData;
    await this.disputeService.handleKlerosUpdate(disputeId, updateData);
  }
}

