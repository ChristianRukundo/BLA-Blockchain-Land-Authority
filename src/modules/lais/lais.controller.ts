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
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LaisService } from './lais.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { LandUseType, ComplianceStatus, ExpropriationStatus } from './entities/land-parcel.entity';
import { ZoneType, ZoneStatus, PlanningAuthority } from './entities/land-use-zone.entity';
import {
  CreateLandParcelDto,
  UpdateLandParcelDto,
  CreateCadastralDataDto,
  UpdateCadastralDataDto,
  CreateLandUseZoneDto,
  UpdateLandUseZoneDto,
  SpatialQueryDto,
  BoundingBoxQueryDto,
  GeometryQueryDto,
  LandParcelListResponseDto,
  LandParcelStatisticsDto,
  CadastralDataStatisticsDto,
} from './dto/lais.dto';

@ApiTags('lais')
@Controller('lais')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LaisController {
  constructor(private readonly laisService: LaisService) {}

  // Land Parcel Endpoints
  @Post('parcels')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Create a new land parcel' })
  @ApiResponse({ status: 201, description: 'Land parcel created successfully' })
  async createLandParcel(@Body() createLandParcelDto: CreateLandParcelDto) {
    try {
      return await this.laisService.createLandParcel(createLandParcelDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create land parcel: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('parcels')
  @ApiOperation({ summary: 'Get all land parcels with filtering' })
  @ApiResponse({ status: 200, description: 'Land parcels retrieved successfully', type: LandParcelListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'landUse', required: false, enum: LandUseType, description: 'Filter by land use type' })
  @ApiQuery({ name: 'complianceStatus', required: false, enum: ComplianceStatus, description: 'Filter by compliance status' })
  @ApiQuery({ name: 'expropriationStatus', required: false, enum: ExpropriationStatus, description: 'Filter by expropriation status' })
  @ApiQuery({ name: 'ownerAddress', required: false, type: String, description: 'Filter by owner address' })
  async findAllLandParcels(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('landUse') landUse?: LandUseType,
    @Query('complianceStatus') complianceStatus?: ComplianceStatus,
    @Query('expropriationStatus') expropriationStatus?: ExpropriationStatus,
    @Query('ownerAddress') ownerAddress?: string,
  ) {
    try {
      return await this.laisService.findAllLandParcels(
        page,
        limit,
        landUse,
        complianceStatus,
        expropriationStatus,
        ownerAddress,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land parcels: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/:id')
  @ApiOperation({ summary: 'Get a land parcel by ID' })
  @ApiResponse({ status: 200, description: 'Land parcel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Land parcel not found' })
  async findLandParcelById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.laisService.findLandParcelById(id);
    } catch (error) {
     throw new HttpException(
        `Failed to retrieve land parcels: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/token/:tokenId')
  @ApiOperation({ summary: 'Get a land parcel by token ID' })
  @ApiResponse({ status: 200, description: 'Land parcel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Land parcel not found' })
  async findLandParcelByTokenId(@Param('tokenId', ParseIntPipe) tokenId: number) {
    try {
      const parcel = await this.laisService.findLandParcelByTokenId(tokenId);
      if (!parcel) {
        throw new HttpException('Land parcel not found', HttpStatus.NOT_FOUND);
      }
      return parcel;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land parcel: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/upi/:upi')
  @ApiOperation({ summary: 'Get a land parcel by UPI' })
  @ApiResponse({ status: 200, description: 'Land parcel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Land parcel not found' })
  async findLandParcelByUPI(@Param('upi') upi: string) {
    try {
      const parcel = await this.laisService.findLandParcelByUPI(upi);
      if (!parcel) {
        throw new HttpException('Land parcel not found', HttpStatus.NOT_FOUND);
      }
      return parcel;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land parcel: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/owner/:ownerAddress')
  @ApiOperation({ summary: 'Get land parcels by owner address' })
  @ApiResponse({ status: 200, description: 'Land parcels retrieved successfully' })
  async findLandParcelsByOwner(@Param('ownerAddress') ownerAddress: string) {
    try {
      return await this.laisService.findLandParcelsByOwner(ownerAddress);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land parcels: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('parcels/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Update a land parcel' })
  @ApiResponse({ status: 200, description: 'Land parcel updated successfully' })
  @ApiResponse({ status: 404, description: 'Land parcel not found' })
  async updateLandParcel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLandParcelDto: UpdateLandParcelDto,
  ) {
    try {
      return await this.laisService.updateLandParcel(id, updateLandParcelDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update land parcel: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('parcels/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a land parcel' })
  @ApiResponse({ status: 200, description: 'Land parcel deleted successfully' })
  @ApiResponse({ status: 404, description: 'Land parcel not found' })
  async deleteLandParcel(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.laisService.deleteLandParcel(id);
      return { message: 'Land parcel deleted successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to delete land parcel: ${( error as any).message}`,
        ( error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Spatial Query Endpoints
  @Post('parcels/spatial/radius')
  @ApiOperation({ summary: 'Find parcels within radius of a point' })
  @ApiResponse({ status: 200, description: 'Parcels within radius retrieved successfully' })
  async findParcelsWithinRadius(@Body() spatialQueryDto: SpatialQueryDto) {
    try {
      const { longitude, latitude, radiusMeters = 1000 } = spatialQueryDto;
      return await this.laisService.findParcelsWithinRadius(longitude, latitude, radiusMeters);
    } catch (error) {
      throw new HttpException(
        `Failed to find parcels within radius: ${( error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('parcels/spatial/bounds')
  @ApiOperation({ summary: 'Find parcels within bounding box' })
  @ApiResponse({ status: 200, description: 'Parcels within bounds retrieved successfully' })
  async findParcelsWithinBounds(@Body() boundingBoxQueryDto: BoundingBoxQueryDto) {
    try {
      const { minLng, minLat, maxLng, maxLat } = boundingBoxQueryDto;
      return await this.laisService.findParcelsWithinBounds(minLng, minLat, maxLng, maxLat);
    } catch (error) {
      throw new HttpException(
        `Failed to find parcels within bounds: ${( error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/:id/adjacent')
  @ApiOperation({ summary: 'Find adjacent parcels' })
  @ApiResponse({ status: 200, description: 'Adjacent parcels retrieved successfully' })
  async findAdjacentParcels(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.laisService.findAdjacentParcels(id);
    } catch (error) {
      throw new HttpException(
        `Failed to find adjacent parcels: ${( error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('parcels/spatial/intersect')
  @ApiOperation({ summary: 'Find parcels intersecting with geometry' })
  @ApiResponse({ status: 200, description: 'Intersecting parcels retrieved successfully' })
  async findIntersectingParcels(@Body() geometryQueryDto: GeometryQueryDto) {
    try {
      return await this.laisService.findIntersectingParcels(geometryQueryDto.geometry);
    } catch (error) {
      throw new HttpException(
        `Failed to find intersecting parcels: ${( error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parcels/:id/area')
  @ApiOperation({ summary: 'Calculate parcel area' })
  @ApiResponse({ status: 200, description: 'Parcel area calculated successfully' })
  async calculateParcelArea(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const areaSqm = await this.laisService.calculateParcelArea(id);
      return {
        parcelId: id,
        areaSqm,
        areaHectares: areaSqm / 10000,
        areaAcres: areaSqm / 4047,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate parcel area: ${( error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Cadastral Data Endpoints
  @Post('cadastral-data')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Create cadastral data' })
  @ApiResponse({ status: 201, description: 'Cadastral data created successfully' })
  async createCadastralData(@Body() createCadastralDataDto: CreateCadastralDataDto) {
    try {
      return await this.laisService.createCadastralData(createCadastralDataDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create cadastral data: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('cadastral-data/parcel/:parcelId')
  @ApiOperation({ summary: 'Get cadastral data for a parcel' })
  @ApiResponse({ status: 200, description: 'Cadastral data retrieved successfully' })
  async findCadastralDataByParcel(@Param('parcelId', ParseUUIDPipe) parcelId: string) {
    try {
      return await this.laisService.findCadastralDataByParcel(parcelId);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve cadastral data: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('cadastral-data/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Update cadastral data' })
  @ApiResponse({ status: 200, description: 'Cadastral data updated successfully' })
  async updateCadastralData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCadastralDataDto: UpdateCadastralDataDto,
  ) {
    try {
      return await this.laisService.updateCadastralData(id, updateCadastralDataDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update cadastral data: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Land Use Zone Endpoints
  @Post('zones')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Create a land use zone' })
  @ApiResponse({ status: 201, description: 'Land use zone created successfully' })
  async createLandUseZone(@Body() createLandUseZoneDto: CreateLandUseZoneDto) {
    try {
      return await this.laisService.createLandUseZone(createLandUseZoneDto);
    } catch (error) {
      throw new HttpException(
        `Failed to create land use zone: ${(error as any).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get all land use zones with filtering' })
  @ApiResponse({ status: 200, description: 'Land use zones retrieved successfully' })
  @ApiQuery({ name: 'zoneType', required: false, enum: ZoneType, description: 'Filter by zone type' })
  @ApiQuery({ name: 'zoneStatus', required: false, enum: ZoneStatus, description: 'Filter by zone status' })
  @ApiQuery({ name: 'planningAuthority', required: false, enum: PlanningAuthority, description: 'Filter by planning authority' })
  async findAllLandUseZones(
    @Query('zoneType') zoneType?: ZoneType,
    @Query('zoneStatus') zoneStatus?: ZoneStatus,
    @Query('planningAuthority') planningAuthority?: PlanningAuthority,
  ) {
    try {
      return await this.laisService.findAllLandUseZones(zoneType, zoneStatus, planningAuthority);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land use zones: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Get a land use zone by ID' })
  @ApiResponse({ status: 200, description: 'Land use zone retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Land use zone not found' })
  async findLandUseZoneById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.laisService.findLandUseZoneById(id);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve land use zone: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('zones/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Update a land use zone' })
  @ApiResponse({ status: 200, description: 'Land use zone updated successfully' })
  @ApiResponse({ status: 404, description: 'Land use zone not found' })
  async updateLandUseZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLandUseZoneDto: UpdateLandUseZoneDto,
  ) {
    try {
      return await this.laisService.updateLandUseZone(id, updateLandUseZoneDto);
    } catch (error) {
      throw new HttpException(
        `Failed to update land use zone: ${(error as any).message}`,
        (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Statistics Endpoints
  @Get('statistics/parcels')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Get land parcel statistics' })
  @ApiResponse({ status: 200, description: 'Land parcel statistics retrieved successfully', type: LandParcelStatisticsDto })
  async getLandParcelStatistics() {
    try {
      return await this.laisService.getLandParcelStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get land parcel statistics: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics/cadastral-data')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RLMUA_OFFICIAL)
  @ApiOperation({ summary: 'Get cadastral data statistics' })
  @ApiResponse({ status: 200, description: 'Cadastral data statistics retrieved successfully', type: CadastralDataStatisticsDto })
  async getCadastralDataStatistics() {
    try {
      return await this.laisService.getCadastralDataStatistics();
    } catch (error) {
      throw new HttpException(
        `Failed to get cadastral data statistics: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
