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
  Logger,
  Req, 
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
import { UserRole } from '../auth/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity'; 
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  DisputeFilterDto,
  SubmitEvidenceDto,
  SubmitToArbitrationDto,
  RecordRulingDto,
  AppealDisputeDto,
  ExecuteConsequencesDto,
  
  DisputeResponseDto,
  PaginatedDisputesResponseDto,
  EvidenceResponseDto,
  DisputeStatisticsResponseDto,
  CancelDisputeBodyDto,
} from './dto/dispute.dto';

import { Request } from 'express'; 

@ApiTags('Dispute Resolution')
@Controller('disputes')
@UseGuards(JwtAuthGuard) 
@ApiBearerAuth()
export class DisputeController {
  private readonly logger = new Logger(DisputeController.name);

  constructor(private readonly disputeService: DisputeService) {}

  
  private toDisputeResponseDto(dispute: any): DisputeResponseDto {
    
    return {
      id: dispute.id,
      externalDisputeId: dispute.externalDisputeId,
      parcelId: dispute.parcelId,
      parcel: dispute.parcel
        ? { upi: dispute.parcel.upi, id: dispute.parcel.id /* map parcel to ParcelResponseDto */ }
        : undefined,
      disputeType: dispute.disputeType,
      status: dispute.status,
      title: dispute.title,
      description: dispute.description,
      plaintiffAddress: dispute.plaintiffAddress,
      defendantAddress: dispute.defendantAddress,
      involvedParties: dispute.involvedParties,
      createdDate: dispute.createdDate,
      evidenceSubmissionDeadline: dispute.evidenceSubmissionDeadline,
      evidenceEntries: dispute.evidenceEntries?.map(e => ({
        id: e.id,
        disputeId: e.disputeId,
        submitterAddress: e.submitterAddress,
        submitterRole: e.submitterRole,
        title: e.title,
        description: e.description,
        evidenceHashOrUrl: e.evidenceHashOrUrl,
        fileType: e.fileType,
        fileSize: e.fileSize,
        submittedDate: e.submittedDate,
        metadata: e.metadata,
      })),
      escalationDate: dispute.escalationDate,
      arbitrationFeePaid: dispute.arbitrationFeePaid,
      arbitrationCourtId: dispute.arbitrationCourtId,
      numberOfArbitrators: dispute.numberOfArbitrators,
      ruling: dispute.ruling,
      rulingDate: dispute.rulingDate,
      rulingDetails: dispute.rulingDetails,
      resolvedDate: dispute.resolvedDate,
      executionTransactionHash: dispute.executionTransactionHash,
      appealDeadline: dispute.appealDeadline,
      appealCount: dispute.appealCount,
      appealFeePaid: dispute.appealFeePaid,
      settlementAmount: dispute.settlementAmount,
      cancellationReason: dispute.cancellationReason,
      notes: dispute.notes,
      metadata: dispute.metadata,
      updatedAt: dispute.updatedAt,
      canSubmitEvidence: dispute.canSubmitEvidence,
      canEscalateToArbitration: dispute.canEscalateToArbitration,
      canAppeal: dispute.canAppeal,
      canExecuteRuling: dispute.canExecuteRuling,
      isActive: dispute.isActive,
    };
  }

  @Post()
  @UseGuards(RolesGuard) 
  @Roles(UserRole.USER as string) 
  @ApiOperation({ summary: 'Create a new dispute' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dispute created successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or active dispute exists',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Land parcel not found' })
  async createDispute(
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: CreateDisputeDto,
    @CurrentUser() user: User, 
  ): Promise<DisputeResponseDto> {
    this.logger.log(`User ${user.walletAddress} creating dispute: ${JSON.stringify(dto)}`);
    const disputeEntity = await this.disputeService.createDispute(dto, user.walletAddress);
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Get()
  @ApiOperation({ summary: 'Get all disputes with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disputes retrieved successfully',
    type: PaginatedDisputesResponseDto,
  })
  
  async findAllDisputes(
    @Query(new ValidationPipe({ transform: true })) filters: DisputeFilterDto,
  ): Promise<PaginatedDisputesResponseDto> {
    this.logger.log(`Finding all disputes with filters: ${JSON.stringify(filters)}`);
    const paginatedResult = await this.disputeService.findAll(filters);
    return {
      data: paginatedResult.data.map(d => this.toDisputeResponseDto(d)),
      meta: paginatedResult.meta,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get dispute statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute statistics retrieved',
    type: DisputeStatisticsResponseDto,
  })
  async getStatistics(): Promise<DisputeStatisticsResponseDto> {
    this.logger.log('Fetching dispute statistics');
    return this.disputeService.getDisputeStatistics(); 
  }

  @Get('active')
  
  @ApiOperation({ summary: 'Get active disputes (not resolved or cancelled)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active disputes retrieved',
    type: [DisputeResponseDto],
  })
  async getActiveDisputes(): Promise<DisputeResponseDto[]> {
    this.logger.log('Fetching active disputes');
    const disputes = await this.disputeService.getActiveDisputes(); 
    return disputes.map(d => this.toDisputeResponseDto(d));
  }

  @Get('my-disputes')
  @ApiOperation({ summary: 'Get disputes involving the current authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User disputes retrieved',
    type: [DisputeResponseDto],
  })
  async getMyDisputes(@CurrentUser() user: User): Promise<DisputeResponseDto[]> {
    this.logger.log(`Fetching disputes for user: ${user.walletAddress}`);
    const disputes = await this.disputeService.findByUserAddress(user.walletAddress);
    return disputes.map(d => this.toDisputeResponseDto(d));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific dispute by its ID' })
  @ApiParam({ name: 'id', description: 'Dispute ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute retrieved',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dispute not found' })
  async findOneDispute(@Param('id', new ParseUUIDPipe()) id: string): Promise<DisputeResponseDto> {
    
    this.logger.log(`Fetching dispute by ID: ${id}`);
    const disputeEntity = await this.disputeService.findOne(id);
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Get('parcel/:parcelId') 
  @ApiOperation({ summary: 'Get all disputes for a specific land parcel' })
  @ApiParam({ name: 'parcelId', description: 'Land parcel ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parcel disputes retrieved',
    type: [DisputeResponseDto],
  })
  async findDisputesByParcelId(
    @Param('parcelId', new ParseUUIDPipe()) parcelId: string,
  ): Promise<DisputeResponseDto[]> {
    
    this.logger.log(`Fetching disputes for parcel ID: ${parcelId}`);
    const disputes = await this.disputeService.findByParcelId(parcelId);
    return disputes.map(d => this.toDisputeResponseDto(d));
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN /* UserRole.DISPUTE_MANAGER */) 
  @ApiOperation({ summary: 'Update a dispute by ID' })
  @ApiParam({ name: 'id', description: 'Dispute ID to update', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute updated successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dispute not found' })
  async updateDisputeController(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateDisputeDto,
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`User ${user.walletAddress} updating dispute ID ${id}: ${JSON.stringify(dto)}`);
    const disputeEntity = await this.disputeService.updateDispute(id, dto, user.walletAddress);
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Submit evidence for a dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID', type: String })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Evidence submitted successfully',
    type: EvidenceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Evidence submission not allowed or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User not authorized to submit evidence',
  })
  async submitDisputeEvidence(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: SubmitEvidenceDto,
    @CurrentUser() user: User,
  ): Promise<EvidenceResponseDto> {
    this.logger.log(`User ${user.walletAddress} submitting evidence for dispute ID ${id}`);
    const evidenceEntity = await this.disputeService.submitEvidence(id, user.walletAddress, dto);
    
    return {
      id: evidenceEntity.id,
      disputeId: evidenceEntity.disputeId,
      submitterAddress: evidenceEntity.submitterAddress,
      submitterRole: evidenceEntity.submitterRole,
      title: evidenceEntity.title,
      description: evidenceEntity.description,
      evidenceHashOrUrl: evidenceEntity.evidenceHashOrUrl,
      fileType: evidenceEntity.fileType,
      fileSize: evidenceEntity.fileSize,
      submittedDate: evidenceEntity.submittedDate,
      metadata: evidenceEntity.metadata,
    };
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'Get all evidence for a specific dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evidence retrieved successfully',
    type: [EvidenceResponseDto],
  })
  async getDisputeEvidence(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<EvidenceResponseDto[]> {
    
    this.logger.log(`Fetching evidence for dispute ID: ${id}`);
    const evidenceList = await this.disputeService.getEvidenceForDispute(id);
    return evidenceList.map(e => ({
      id: e.id,
      disputeId: e.disputeId,
      submitterAddress: e.submitterAddress,
      submitterRole: e.submitterRole,
      title: e.title,
      description: e.description,
      evidenceHashOrUrl: e.evidenceHashOrUrl,
      fileType: e.fileType,
      fileSize: e.fileSize,
      submittedDate: e.submittedDate,
      metadata: e.metadata,
    }));
  }

  @Post(':id/submit-to-arbitration') 
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN /* UserRole.DISPUTE_MANAGER */)
  @ApiOperation({ summary: 'Submit a dispute to an arbitration platform' })
  @ApiParam({ name: 'id', description: 'Dispute ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute submitted to arbitration',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dispute not ready for arbitration' })
  async submitDisputeToArbitration(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: SubmitToArbitrationDto,
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(
      `User ${user.walletAddress} submitting dispute ID ${id} to arbitration: ${JSON.stringify(dto)}`,
    );
    const disputeEntity = await this.disputeService.submitToArbitration(
      id,
      dto,
      user.walletAddress,
    );
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Post(':id/record-ruling') 
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN /* UserRole.ARBITRATOR_ROLE */) 
  @ApiOperation({ summary: 'Record a ruling from an arbitration platform' })
  @ApiParam({ name: 'id', description: 'Dispute ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ruling recorded successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot record ruling for this dispute',
  })
  async recordArbitrationRuling(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: RecordRulingDto,
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(
      `User ${user.walletAddress} recording ruling for dispute ID ${id}: ${JSON.stringify(dto)}`,
    );
    const disputeEntity = await this.disputeService.recordRuling(id, dto, user.walletAddress);
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Post(':id/apply-ruling') 
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN /* UserRole.DISPUTE_MANAGER */)
  @ApiOperation({ summary: 'Apply the consequences of a recorded ruling' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ruling consequences applied',
    type: DisputeResponseDto,
  })
  async applyRulingConsequences(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: ExecuteConsequencesDto,
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`User ${user.walletAddress} applying ruling consequences for dispute ${id}`);
    const dispute = await this.disputeService.applyRulingConsequences(id, dto, user.walletAddress);
    return this.toDisputeResponseDto(dispute);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Appeal a dispute ruling' })
  @ApiParam({ name: 'id', description: 'Dispute ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute appeal initiated',
    type: DisputeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dispute cannot be appealed or invalid data',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User not authorized to appeal' })
  async appealDisputeController(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    dto: AppealDisputeDto,
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`User ${user.walletAddress} appealing dispute ID ${id}`);
    const disputeEntity = await this.disputeService.appealDispute(id, user.walletAddress, dto);
    return this.toDisputeResponseDto(disputeEntity);
  }

  @Put(':id/cancel') 
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN /* UserRole.DISPUTE_MANAGER */)
  @ApiOperation({ summary: 'Cancel a dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID to cancel', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute cancelled successfully',
    type: DisputeResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dispute cannot be cancelled' })
  async cancelDisputeController(
    
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    body: CancelDisputeBodyDto, 
    @CurrentUser() user: User,
  ): Promise<DisputeResponseDto> {
    this.logger.log(
      `User ${user.walletAddress} cancelling dispute ID ${id}. Reason: ${body.reason}`,
    );
    const disputeEntity = await this.disputeService.cancelDispute(
      id,
      body.reason,
      user.walletAddress,
    );
    return this.toDisputeResponseDto(disputeEntity);
  }

 
  @Post('arbitration-webhook/:externalDisputeId') 
  @ApiOperation({ summary: 'Handle arbitration platform webhook updates (e.g., Kleros)' })
  @ApiParam({ name: 'externalDisputeId', description: 'The ID from the arbitration platform' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid webhook payload' })
  async handleArbitrationPlatformWebhook(
    @Param('externalDisputeId') externalDisputeId: string,
    @Body() webhookData: any, 
  ): Promise<void> {
    this.logger.log(
      `Received arbitration platform webhook for external ID ${externalDisputeId}: ${JSON.stringify(webhookData)}`,
    );
    
    await this.disputeService.handleArbitrationPlatformUpdate(externalDisputeId, webhookData);
    
  }
}


