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
import { InheritanceService } from './inheritance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { InheritanceStatus } from './entities/inheritance.entity';
import { RequestStatus } from './entities/inheritance-request.entity';
import {
  CreateInheritanceDto,
  UpdateInheritanceDto,
  CreateInheritanceRequestDto,
  ProcessInheritanceRequestDto,
  InheritanceListResponseDto,
  InheritanceRequestListResponseDto,
  InheritanceStatisticsDto,
} from './dto/inheritance.dto';

@ApiTags('inheritance')
@Controller('inheritance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InheritanceController {
  constructor(private readonly inheritanceService: InheritanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inheritance designation' })
  @ApiResponse({ status: 201, description: 'Inheritance created successfully' })
  async createInheritance(@Body() createInheritanceDto: CreateInheritanceDto) {
    try {
      return await this.inheritanceService.createInheritance(createInheritanceDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create inheritance: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all inheritances with filtering' })
  @ApiResponse({ status: 200, description: 'Inheritances retrieved successfully', type: InheritanceListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: InheritanceStatus, description: 'Filter by inheritance status' })
  @ApiQuery({ name: 'currentOwner', required: false, type: String, description: 'Filter by current owner address' })
  @ApiQuery({ name: 'designatedHeir', required: false, type: String, description: 'Filter by designated heir address' })
  async findAllInheritances(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: InheritanceStatus,
    @Query('currentOwner') currentOwner?: string,
    @Query('designatedHeir') designatedHeir?: string,
  ) {
    try {
      return await this.inheritanceService.findAll(page, limit, status, currentOwner, designatedHeir);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve inheritances: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inheritance by ID' })
  @ApiResponse({ status: 200, description: 'Inheritance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Inheritance not found' })
  async findInheritanceById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.inheritanceService.findOne(id);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve inheritance: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('land-parcel/:landParcelId')
  @ApiOperation({ summary: 'Get inheritance by land parcel ID' })
  @ApiResponse({ status: 200, description: 'Inheritance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Inheritance not found' })
  async findInheritanceByLandParcel(@Param('landParcelId', ParseUUIDPipe) landParcelId: string) {
    try {
      const inheritance = await this.inheritanceService.findByLandParcel(landParcelId);
      if (!inheritance) {
        throw new HttpException('No active inheritance found for this land parcel', HttpStatus.NOT_FOUND);
      }
      return inheritance;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve inheritance: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inheritance' })
  @ApiResponse({ status: 200, description: 'Inheritance updated successfully' })
  @ApiResponse({ status: 404, description: 'Inheritance not found' })
  async updateInheritance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInheritanceDto: UpdateInheritanceDto,
  ) {
    try {
      return await this.inheritanceService.update(id, updateInheritanceDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update inheritance: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an inheritance' })
  @ApiResponse({ status: 200, description: 'Inheritance cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Inheritance not found' })
  async cancelInheritance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelData: { cancelledBy: string; reason: string },
  ) {
    try {
      return await this.inheritanceService.cancelInheritance(id, cancelData.cancelledBy, cancelData.reason);
    } catch (error) {
      throw new HttpException(
        `Failed to cancel inheritance: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Inheritance Request Endpoints
  @Post('requests')
  @ApiOperation({ summary: 'Create an inheritance request' })
  @ApiResponse({ status: 201, description: 'Inheritance request created successfully' })
  async createInheritanceRequest(@Body() createRequestDto: CreateInheritanceRequestDto) {
    try {
      return await this.inheritanceService.createInheritanceRequest(createRequestDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create inheritance request: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORACLE_OPERATOR)
  @ApiOperation({ summary: 'Get all inheritance requests with filtering' })
  @ApiResponse({ status: 200, description: 'Inheritance requests retrieved successfully', type: InheritanceRequestListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: RequestStatus, description: 'Filter by request status' })
  @ApiQuery({ name: 'requestedBy', required: false, type: String, description: 'Filter by requester address' })
  async findAllInheritanceRequests(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: RequestStatus,
    @Query('requestedBy') requestedBy?: string,
  ) {
    try {
      return await this.inheritanceService.getInheritanceRequests(page, limit, status, requestedBy);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve inheritance requests: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('requests/:requestId/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORACLE_OPERATOR)
  @ApiOperation({ summary: 'Process an inheritance request' })
  @ApiResponse({ status: 200, description: 'Inheritance request processed successfully' })
  @ApiResponse({ status: 404, description: 'Inheritance request not found' })
  async processInheritanceRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() processDto: ProcessInheritanceRequestDto,
  ) {
    try {
      return await this.inheritanceService.processInheritanceRequest(requestId, processDto);
    } catch (error) {
      throw new HttpException(
        `Failed to process inheritance request: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:address/inheritances')
  @ApiOperation({ summary: 'Get inheritances for a specific user (as owner or heir)' })
  @ApiResponse({ status: 200, description: 'User inheritances retrieved successfully' })
  async getUserInheritances(
    @Param('address') address: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('role') role?: 'owner' | 'heir',
  ) {
    try {
      if (role === 'owner') {
        return await this.inheritanceService.findAll(page, limit, undefined, address);
      } else if (role === 'heir') {
        return await this.inheritanceService.findAll(page, limit, undefined, undefined, address);
      } else {
        // Return both owner and heir inheritances
        const [asOwner, asHeir] = await Promise.all([
          this.inheritanceService.findAll(page, limit, undefined, address),
          this.inheritanceService.findAll(page, limit, undefined, undefined, address),
        ]);
        
        return {
          asOwner,
          asHeir,
        };
      }
    } catch (error) {
      throw new HttpException(
        `Failed to get user inheritances: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:address/requests')
  @ApiOperation({ summary: 'Get inheritance requests for a specific user' })
  @ApiResponse({ status: 200, description: 'User inheritance requests retrieved successfully' })
  async getUserInheritanceRequests(
    @Param('address') address: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    try {
      return await this.inheritanceService.getInheritanceRequests(page, limit, undefined, address);
    } catch (error) {
      throw new HttpException(
        `Failed to get user inheritance requests: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get inheritance statistics' })
  @ApiResponse({ status: 200, description: 'Inheritance statistics retrieved successfully', type: InheritanceStatisticsDto })
  async getInheritanceStatistics() {
    try {
      return await this.inheritanceService.getStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get inheritance statistics: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active-inheritances')
  @ApiOperation({ summary: 'Get all active inheritances' })
  @ApiResponse({ status: 200, description: 'Active inheritances retrieved successfully' })
  async getActiveInheritances() {
    try {
      return await this.inheritanceService.findAll(1, 100, InheritanceStatus.ACTIVE);
    } catch (error) {
      throw new HttpException(
        `Failed to get active inheritances: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pending-requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORACLE_OPERATOR)
  @ApiOperation({ summary: 'Get all pending inheritance requests' })
  @ApiResponse({ status: 200, description: 'Pending inheritance requests retrieved successfully' })
  async getPendingRequests() {
    try {
      return await this.inheritanceService.getInheritanceRequests(1, 100, RequestStatus.PENDING);
    } catch (error) {
      throw new HttpException(
        `Failed to get pending requests: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
