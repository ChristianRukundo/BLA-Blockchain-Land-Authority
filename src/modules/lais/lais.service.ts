import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { LandParcel, LandUseType, ComplianceStatus, ExpropriationStatus } from './entities/land-parcel.entity';
import { CadastralData, CadastralDataType, DataSource, DataQuality } from './entities/cadastral-data.entity';
import { LandUseZone, ZoneType, ZoneStatus, PlanningAuthority } from './entities/land-use-zone.entity';
import {
  CreateLandParcelDto,
  UpdateLandParcelDto,
  CreateCadastralDataDto,
  UpdateCadastralDataDto,
  CreateLandUseZoneDto,
  UpdateLandUseZoneDto,
  SpatialQueryDto,
} from './dto/lais.dto';

@Injectable()
export class LaisService {
  private readonly logger = new Logger(LaisService.name);

  constructor(
    @InjectRepository(LandParcel)
    private readonly landParcelRepository: Repository<LandParcel>,
    @InjectRepository(CadastralData)
    private readonly cadastralDataRepository: Repository<CadastralData>,
    @InjectRepository(LandUseZone)
    private readonly landUseZoneRepository: Repository<LandUseZone>,
  ) {}

  // Land Parcel Operations
  async createLandParcel(createLandParcelDto: CreateLandParcelDto): Promise<LandParcel> {
    try {
      // Check if UPI already exists
      if (createLandParcelDto.upi) {
        const existingParcel = await this.landParcelRepository.findOne({
          where: { upi: createLandParcelDto.upi },
        });
        if (existingParcel) {
          throw new BadRequestException(`Land parcel with UPI ${createLandParcelDto.upi} already exists`);
        }
      }

      // Check if token ID already exists
      if (createLandParcelDto.tokenId) {
        const existingToken = await this.landParcelRepository.findOne({
          where: { tokenId: createLandParcelDto.tokenId },
        });
        if (existingToken) {
          throw new BadRequestException(`Land parcel with token ID ${createLandParcelDto.tokenId} already exists`);
        }
      }

      const landParcel = this.landParcelRepository.create({
        ...createLandParcelDto,
        complianceStatus: ComplianceStatus.PENDING_ASSESSMENT,
        expropriationStatus: ExpropriationStatus.NOT_FLAGGED,
      });

      const savedParcel = await this.landParcelRepository.save(landParcel);
      this.logger.log(`Land parcel created with ID: ${savedParcel.id}`);
      
      return savedParcel;
    } catch (error) {
      this.logger.error('Failed to create land parcel', error);
      throw error;
    }
  }

  async findAllLandParcels(
    page: number = 1,
    limit: number = 10,
    landUse?: LandUseType,
    complianceStatus?: ComplianceStatus,
    expropriationStatus?: ExpropriationStatus,
    ownerAddress?: string,
  ): Promise<{ parcels: LandParcel[]; total: number; page: number; limit: number }> {
    try {
      const where: FindOptionsWhere<LandParcel> = {};
      
      if (landUse) where.landUse = landUse;
      if (complianceStatus) where.complianceStatus = complianceStatus;
      if (expropriationStatus) where.expropriationStatus = expropriationStatus;
      if (ownerAddress) where.ownerAddress = ownerAddress.toLowerCase();

      const [parcels, total] = await this.landParcelRepository.findAndCount({
        where,
        relations: ['cadastralData'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { parcels, total, page, limit };
    } catch (error) {
      this.logger.error('Failed to fetch land parcels', error);
      throw error;
    }
  }

  async findLandParcelById(id: string): Promise<LandParcel> {
    try {
      const landParcel = await this.landParcelRepository.findOne({
        where: { id },
        relations: ['cadastralData'],
      });

      if (!landParcel) {
        throw new NotFoundException(`Land parcel with ID ${id} not found`);
      }

      return landParcel;
    } catch (error) {
      this.logger.error(`Failed to find land parcel with ID: ${id}`, error);
      throw error;
    }
  }

  async findOne(id: string): Promise<LandParcel> {
    return this.findLandParcelById(id);
  }

  async findLandParcelByTokenId(tokenId: number): Promise<LandParcel | null> {
    try {
      return await this.landParcelRepository.findOne({
        where: { tokenId },
        relations: ['cadastralData'],
      });
    } catch (error) {
      this.logger.error(`Failed to find land parcel by token ID: ${tokenId}`, error);
      throw error;
    }
  }

  async findLandParcelByUPI(upi: string): Promise<LandParcel | null> {
    try {
      return await this.landParcelRepository.findOne({
        where: { upi },
        relations: ['cadastralData'],
      });
    } catch (error) {
      this.logger.error(`Failed to find land parcel by UPI: ${upi}`, error);
      throw error;
    }
  }

  async findLandParcelsByOwner(ownerAddress: string): Promise<LandParcel[]> {
    try {
      return await this.landParcelRepository.find({
        where: { ownerAddress: ownerAddress.toLowerCase() },
        relations: ['cadastralData'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to find land parcels by owner: ${ownerAddress}`, error);
      throw error;
    }
  }

  async getLandParcelById(id: string): Promise<LandParcel> { // Renamed from findLandParcelById for consistency
    this.logger.debug(`Finding land parcel by DB ID: ${id}`);
    const landParcel = await this.landParcelRepository.findOne({
      where: { id },
      relations: ['cadastralData'],
    });
    
    if (!landParcel) {
      throw new NotFoundException(`Land parcel with DB ID "${id}" not found.`);
    }
    return landParcel;
  }

  async updateLandParcel(id: string, updateLandParcelDto: UpdateLandParcelDto): Promise<LandParcel> {
    this.logger.log(`Attempting to update land parcel DB ID: ${id}`);
    try {
      const landParcel = await this.getLandParcelById(id);

      await this.ensureUpiIsUnique(id, updateLandParcelDto.upi, landParcel.upi);
      await this.ensureTokenIdIsUnique(id, updateLandParcelDto.tokenId, landParcel.tokenId);

      if (updateLandParcelDto.ownerAddress) {
        updateLandParcelDto.ownerAddress = updateLandParcelDto.ownerAddress.toLowerCase();
      }
      if (updateLandParcelDto.nominatedHeir !== undefined) {
        updateLandParcelDto.nominatedHeir = updateLandParcelDto.nominatedHeir ? updateLandParcelDto.nominatedHeir.toLowerCase() : null;
      }

      this.landParcelRepository.merge(landParcel, updateLandParcelDto);

      const updatedParcel = await this.landParcelRepository.save(landParcel);
      this.logger.log(`Land parcel DB ID ${id} updated successfully.`);
      return updatedParcel;
    } catch (error) {
      this.logger.error(`Failed to update land parcel DB ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Failed to update land parcel.`);
    }
  }

  private async ensureUpiIsUnique(id: string, newUpi?: string, currentUpi?: string): Promise<void> {
    if (newUpi && newUpi !== currentUpi) {
      const existingUpi = await this.landParcelRepository.findOneBy({ upi: newUpi });
      if (existingUpi && existingUpi.id !== id) {
        throw new BadRequestException(`UPI "${newUpi}" is already in use by another parcel.`);
      }
    }
  }

  private async ensureTokenIdIsUnique(id: string, newTokenId?: number, currentTokenId?: number): Promise<void> {
    if (newTokenId !== undefined && newTokenId !== currentTokenId) {
      const existingToken = await this.landParcelRepository.findOneBy({ tokenId: newTokenId });
      if (existingToken && existingToken.id !== id) {
        throw new BadRequestException(`Token ID "${newTokenId}" is already in use by another parcel.`);
      }
    }
  }

  async deleteLandParcel(id: string): Promise<void> {
    try {
      const landParcel = await this.findLandParcelById(id);
      await this.landParcelRepository.remove(landParcel);
      this.logger.log(`Land parcel deleted with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete land parcel with ID: ${id}`, error);
      throw error;
    }
  }

  async updateComplianceStatus(parcelId: string, status: ComplianceStatus): Promise<LandParcel> {
    try {
      const landParcel = await this.findLandParcelById(parcelId);
      
      landParcel.complianceStatus = status;
      landParcel.lastAssessmentDate = new Date();
      
      const updatedParcel = await this.landParcelRepository.save(landParcel);
      this.logger.log(`Updated compliance status for parcel ${parcelId} to ${status}`);
      
      return updatedParcel;
    } catch (error) {
      this.logger.error(`Failed to update compliance status for parcel ${parcelId}`, error);
      throw error;
    }
  }

  async updateDisputeStatus(parcelId: string, isUnderDispute: boolean): Promise<LandParcel> {
    try {
      const landParcel = await this.findLandParcelById(parcelId);
      
      landParcel.underDispute = isUnderDispute;
      
      const updatedParcel = await this.landParcelRepository.save(landParcel);
      this.logger.log(`Updated dispute status for parcel ${parcelId} to ${isUnderDispute ? 'under dispute' : 'not under dispute'}`);
      
      return updatedParcel;
    } catch (error) {
      this.logger.error(`Failed to update dispute status for parcel ${parcelId}`, error);
      throw error;
    }
  }

  // Spatial Query Operations (PostGIS)
  async findParcelsWithinRadius(
    longitude: number,
    latitude: number,
    radiusMeters: number,
  ): Promise<LandParcel[]> {
    try {
      const query = `
        SELECT * FROM land_parcels 
        WHERE ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ORDER BY ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )
      `;

      const parcels = await this.landParcelRepository.query(query, [
        longitude,
        latitude,
        radiusMeters,
      ]);

      return parcels;
    } catch (error) {
      this.logger.error('Failed to find parcels within radius', error);
      throw error;
    }
  }

  async findParcelsWithinBounds(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
  ): Promise<LandParcel[]> {
    try {
      const query = `
        SELECT * FROM land_parcels 
        WHERE ST_Within(
          location,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)
        )
      `;

      const parcels = await this.landParcelRepository.query(query, [
        minLng,
        minLat,
        maxLng,
        maxLat,
      ]);

      return parcels;
    } catch (error) {
      this.logger.error('Failed to find parcels within bounds', error);
      throw error;
    }
  }

  async findAdjacentParcels(parcelId: string): Promise<LandParcel[]> {
    try {
      const parcel = await this.findLandParcelById(parcelId);
      
      const query = `
        SELECT p.* FROM land_parcels p
        WHERE p.id != $1 
        AND ST_Touches(p.geometry, $2)
      `;

      const adjacentParcels = await this.landParcelRepository.query(query, [
        parcelId,
        parcel.location,
      ]);

      return adjacentParcels;
    } catch (error) {
      this.logger.error(`Failed to find adjacent parcels for ID: ${parcelId}`, error);
      throw error;
    }
  }

  async findIntersectingParcels(geometry: any): Promise<LandParcel[]> {
    try {
      const query = `
        SELECT * FROM land_parcels 
        WHERE ST_Intersects(geometry, ST_GeomFromGeoJSON($1))
      `;

      const parcels = await this.landParcelRepository.query(query, [
        JSON.stringify(geometry),
      ]);

      return parcels;
    } catch (error) {
      this.logger.error('Failed to find intersecting parcels', error);
      throw error;
    }
  }

  async calculateParcelArea(parcelId: string): Promise<number> {
    try {
      const query = `
        SELECT ST_Area(geometry::geography) as area_sqm 
        FROM land_parcels 
        WHERE id = $1
      `;

      const result = await this.landParcelRepository.query(query, [parcelId]);
      return result[0]?.area_sqm || 0;
    } catch (error) {
      this.logger.error(`Failed to calculate area for parcel ID: ${parcelId}`, error);
      throw error;
    }
  }

  // Cadastral Data Operations
  async createCadastralData(createCadastralDataDto: CreateCadastralDataDto): Promise<CadastralData> {
    try {
      // Verify land parcel exists
      await this.findLandParcelById(createCadastralDataDto.landParcelId);

      const cadastralData = this.cadastralDataRepository.create(createCadastralDataDto);
      const savedData = await this.cadastralDataRepository.save(cadastralData);
      
      this.logger.log(`Cadastral data created with ID: ${savedData.id}`);
      return savedData;
    } catch (error) {
      this.logger.error('Failed to create cadastral data', error);
      throw error;
    }
  }

  async findCadastralDataByParcel(landParcelId: string): Promise<CadastralData[]> {
    try {
      return await this.cadastralDataRepository.find({
        where: { landParcelId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to find cadastral data for parcel: ${landParcelId}`, error);
      throw error;
    }
  }

  async updateCadastralData(id: string, updateCadastralDataDto: UpdateCadastralDataDto): Promise<CadastralData> {
    try {
      const cadastralData = await this.cadastralDataRepository.findOne({ where: { id } });
      if (!cadastralData) {
        throw new NotFoundException(`Cadastral data with ID ${id} not found`);
      }

      Object.assign(cadastralData, updateCadastralDataDto);
      const updatedData = await this.cadastralDataRepository.save(cadastralData);
      
      this.logger.log(`Cadastral data updated with ID: ${id}`);
      return updatedData;
    } catch (error) {
      this.logger.error(`Failed to update cadastral data with ID: ${id}`, error);
      throw error;
    }
  }

  // Land Use Zone Operations
  async createLandUseZone(createLandUseZoneDto: CreateLandUseZoneDto): Promise<LandUseZone> {
    try {
      // Check if zone code already exists
      const existingZone = await this.landUseZoneRepository.findOne({
        where: { zoneCode: createLandUseZoneDto.zoneCode },
      });
      if (existingZone) {
        throw new BadRequestException(`Zone code ${createLandUseZoneDto.zoneCode} already exists`);
      }

      const landUseZone = this.landUseZoneRepository.create(createLandUseZoneDto);
      const savedZone = await this.landUseZoneRepository.save(landUseZone);
      
      this.logger.log(`Land use zone created with ID: ${savedZone.id}`);
      return savedZone;
    } catch (error) {
      this.logger.error('Failed to create land use zone', error);
      throw error;
    }
  }

  async findAllLandUseZones(
    zoneType?: ZoneType,
    zoneStatus?: ZoneStatus,
    planningAuthority?: PlanningAuthority,
  ): Promise<LandUseZone[]> {
    try {
      const where: FindOptionsWhere<LandUseZone> = {};
      
      if (zoneType) where.zoneType = zoneType;
      if (zoneStatus) where.zoneStatus = zoneStatus;
      if (planningAuthority) where.planningAuthority = planningAuthority;

      return await this.landUseZoneRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Failed to fetch land use zones', error);
      throw error;
    }
  }

  async findLandUseZoneById(id: string): Promise<LandUseZone> {
    try {
      const zone = await this.landUseZoneRepository.findOne({ where: { id } });
      if (!zone) {
        throw new NotFoundException(`Land use zone with ID ${id} not found`);
      }
      return zone;
    } catch (error) {
      this.logger.error(`Failed to find land use zone with ID: ${id}`, error);
      throw error;
    }
  }

  async updateLandUseZone(id: string, updateLandUseZoneDto: UpdateLandUseZoneDto): Promise<LandUseZone> {
    try {
      const zone = await this.findLandUseZoneById(id);

      // Check zone code uniqueness if being updated
      if (updateLandUseZoneDto.zoneCode && updateLandUseZoneDto.zoneCode !== zone.zoneCode) {
        const existingZone = await this.landUseZoneRepository.findOne({
          where: { zoneCode: updateLandUseZoneDto.zoneCode },
        });
        if (existingZone && existingZone.id !== id) {
          throw new BadRequestException(`Zone code ${updateLandUseZoneDto.zoneCode} is already in use`);
        }
      }

      Object.assign(zone, updateLandUseZoneDto);
      const updatedZone = await this.landUseZoneRepository.save(zone);
      
      this.logger.log(`Land use zone updated with ID: ${id}`);
      return updatedZone;
    } catch (error) {
      this.logger.error(`Failed to update land use zone with ID: ${id}`, error);
      throw error;
    }
  }

  // Statistics and Analytics
  async getLandParcelStatistics(): Promise<{
    totalParcels: number;
    parcelsByLandUse: Record<LandUseType, number>;
    parcelsByComplianceStatus: Record<ComplianceStatus, number>;
    parcelsByExpropriationStatus: Record<ExpropriationStatus, number>;
    totalArea: number;
    averageArea: number;
  }> {
    try {
      const totalParcels = await this.landParcelRepository.count();

      // Get counts by land use
      const parcelsByLandUse = {} as Record<LandUseType, number>;
      for (const landUse of Object.values(LandUseType)) {
        parcelsByLandUse[landUse] = await this.landParcelRepository.count({
          where: { landUse },
        });
      }

      // Get counts by compliance status
      const parcelsByComplianceStatus = {} as Record<ComplianceStatus, number>;
      for (const status of Object.values(ComplianceStatus)) {
        parcelsByComplianceStatus[status] = await this.landParcelRepository.count({
          where: { complianceStatus: status },
        });
      }

      // Get counts by expropriation status
      const parcelsByExpropriationStatus = {} as Record<ExpropriationStatus, number>;
      for (const status of Object.values(ExpropriationStatus)) {
        parcelsByExpropriationStatus[status] = await this.landParcelRepository.count({
          where: { expropriationStatus: status },
        });
      }

      // Calculate total and average area
      const areaQuery = await this.landParcelRepository.query(`
        SELECT 
          SUM(ST_Area(geometry::geography)) as total_area,
          AVG(ST_Area(geometry::geography)) as average_area
        FROM land_parcels
      `);

      const totalArea = areaQuery[0]?.total_area || 0;
      const averageArea = areaQuery[0]?.average_area || 0;

      return {
        totalParcels,
        parcelsByLandUse,
        parcelsByComplianceStatus,
        parcelsByExpropriationStatus,
        totalArea,
        averageArea,
      };
    } catch (error) {
      this.logger.error('Failed to get land parcel statistics', error);
      throw error;
    }
  }

  async getCadastralDataStatistics(): Promise<{
    totalRecords: number;
    recordsByType: Record<CadastralDataType, number>;
    recordsBySource: Record<DataSource, number>;
    recordsByQuality: Record<DataQuality, number>;
    verifiedRecords: number;
    recentRecords: number;
  }> {
    try {
      const totalRecords = await this.cadastralDataRepository.count();
      const verifiedRecords = await this.cadastralDataRepository.count({
        where: { isVerified: true },
      });

      // Recent records (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRecords = await this.cadastralDataRepository.count({
        where: { createdAt: Between(thirtyDaysAgo, new Date()) },
      });

      // Get counts by type
      const recordsByType = {} as Record<CadastralDataType, number>;
      for (const type of Object.values(CadastralDataType)) {
        recordsByType[type] = await this.cadastralDataRepository.count({
          where: { dataType: type },
        });
      }

      // Get counts by source
      const recordsBySource = {} as Record<DataSource, number>;
      for (const source of Object.values(DataSource)) {
        recordsBySource[source] = await this.cadastralDataRepository.count({
          where: { dataSource: source },
        });
      }

      // Get counts by quality
      const recordsByQuality = {} as Record<DataQuality, number>;
      for (const quality of Object.values(DataQuality)) {
        recordsByQuality[quality] = await this.cadastralDataRepository.count({
          where: { dataQuality: quality },
        });
      }

      return {
        totalRecords,
        recordsByType,
        recordsBySource,
        recordsByQuality,
        verifiedRecords,
        recentRecords,
      };
    } catch (error) {
      this.logger.error('Failed to get cadastral data statistics', error);
      throw error;
    }
  }
}