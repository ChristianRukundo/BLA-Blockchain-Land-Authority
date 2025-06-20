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
import { ExpropriationService } from './expropriation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import {
  CreateExpropriationDto,
  UpdateExpropriationDto,
  ExpropriationFilterDto,
  DepositCompensationDto,
  ClaimCompensationDto,
  CompleteExpropriationDto,
} from './dto/expropriation.dto';
import { Expropriation } from './entities/expropriation.entity';

@ApiTags('Expropriation')
@Controller('expropriation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExpropriationController {
  constructor(private readonly expropriationService: ExpropriationService) {}

  @Post()
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Create new expropriation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Expropriation created successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body(ValidationPipe) dto: CreateExpropriationDto,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.createExpropriation(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expropriations with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriations retrieved successfully',
  })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'expropriatingAuthority', required: false, description: 'Filter by authority' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(@Query(ValidationPipe) filters: ExpropriationFilterDto) {
    return this.expropriationService.findAll(filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get expropriation statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation statistics retrieved successfully',
  })
  async getStatistics() {
    return this.expropriationService.getExpropriationStatistics();
  }

  @Get('my-expropriations')
  @ApiOperation({ summary: 'Get current user expropriations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User expropriations retrieved successfully',
  })
  async getMyExpropriations(@CurrentUser() user: User): Promise<Expropriation[]> {
    return this.expropriationService.findByOwner(user.walletAddress);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expropriation by ID' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation retrieved successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expropriation not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Expropriation> {
    return this.expropriationService.findOne(id);
  }

  @Get('parcel/:parcelId')
  @ApiOperation({ summary: 'Get expropriations for a specific parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parcel expropriations retrieved successfully',
  })
  async getParcelExpropriations(@Param('parcelId') parcelId: string): Promise<Expropriation[]> {
    return this.expropriationService.findByParcel(parcelId);
  }

  @Put(':id')
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Update expropriation' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation updated successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expropriation not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateExpropriationDto,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.update(id, dto);
  }

  @Post(':id/deposit-compensation')
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Deposit compensation for expropriation' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compensation deposited successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot deposit compensation or invalid amount',
  })
  async depositCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: DepositCompensationDto,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.depositCompensation(id, dto);
  }

  @Post(':id/claim-compensation')
  @ApiOperation({ summary: 'Claim compensation for expropriation' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compensation claimed successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot claim compensation',
  })
  async claimCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ClaimCompensationDto,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.claimCompensation(id, dto);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Complete expropriation process' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation completed successfully',
    type: Expropriation,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot complete expropriation',
  })
  async completeExpropriation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: CompleteExpropriationDto,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.completeExpropriation(id, dto);
  }

  @Put(':id/cancel')
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Cancel expropriation' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation cancelled successfully',
    type: Expropriation,
  })
  async cancelExpropriation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('cancellationReason') reason: string,
    @CurrentUser() user: User,
  ): Promise<Expropriation> {
    return this.expropriationService.cancelExpropriation(id, reason);
  }

  // Smart Contract Integration Endpoints
  @Get('on-chain/escrowed-funds/:parcelId')
  @ApiOperation({ summary: 'Get escrowed funds for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escrowed funds retrieved successfully',
  })
  async getEscrowedFunds(@Param('parcelId') parcelId: string): Promise<{ amount: string }> {
    const amount = await this.expropriationService.getEscrowedFunds(parseInt(parcelId));
    return { amount };
  }

  @Get('on-chain/compensation-status/:parcelId')
  @ApiOperation({ summary: 'Check compensation status on-chain' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compensation status retrieved successfully',
  })
  async getCompensationStatus(@Param('parcelId') parcelId: string) {
    return this.expropriationService.getCompensationStatus(parseInt(parcelId));
  }

  @Post('sync/:id')
  @Roles('ADMIN', 'EXPROPRIATION_OFFICER')
  @ApiOperation({ summary: 'Sync expropriation with on-chain data' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expropriation synced successfully',
    type: Expropriation,
  })
  async syncWithChain(@Param('id', ParseUUIDPipe) id: string): Promise<Expropriation> {
    return this.expropriationService.syncWithChain(id);
  }

  // Document Management
  @Get(':id/documents')
  @ApiOperation({ summary: 'Get expropriation documents' })
  @ApiParam({ name: 'id', description: 'Expropriation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documents retrieved successfully',
  })
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.expropriationService.getExpropriationDocuments(id);
  }

  @Get('document/:hash')
  @ApiOperation({ summary: 'Get document content from IPFS' })
  @ApiParam({ name: 'hash', description: 'IPFS hash' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document content retrieved successfully',
  })
  async getDocument(@Param('hash') hash: string) {
    return this.expropriationService.getDocumentFromIPFS(hash);
  }

  // Reporting and Analytics
  @Get('reports/monthly')
  @Roles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get monthly expropriation report' })
  @ApiQuery({ name: 'year', required: false, description: 'Year for report' })
  @ApiQuery({ name: 'month', required: false, description: 'Month for report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monthly report retrieved successfully',
  })
  async getMonthlyReport(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.expropriationService.getMonthlyReport(year, month);
  }

  @Get('reports/compensation-summary')
  @Roles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Get compensation summary report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compensation summary retrieved successfully',
  })
  async getCompensationSummary() {
    return this.expropriationService.getCompensationSummary();
  }
}

