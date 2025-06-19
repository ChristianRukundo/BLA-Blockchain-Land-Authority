import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expropriation, ExpropriationStatus } from './entities/expropriation.entity';
import {
  CreateExpropriationDto,
  UpdateExpropriationDto,
  ExpropriationFilterDto,
  DepositCompensationDto,
  ClaimCompensationDto,
  CompleteExpropriationDto,
} from './dto/expropriation.dto';
import { LaisService } from '../lais/lais.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { NotificationService } from '../notification/notification.service';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExpropriationService {
  private provider: ethers.providers.JsonRpcProvider;
  private expropriationContract: ethers.Contract;
  private mockRWFContract: ethers.Contract;
  private landParcelNFTContract: ethers.Contract;

  constructor(
    @InjectRepository(Expropriation)
    private expropriationRepository: Repository<Expropriation>,
    private laisService: LaisService,
    private ipfsService: IpfsService,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {
    this.initializeContracts();
  }

  private async initializeContracts() {
    const rpcUrl = this.configService.get<string>('ARBITRUM_RPC_URL');
    const expropriationAddress = this.configService.get<string>('EXPROPRIATION_COMPENSATION_MANAGER_ADDRESS');
    const mockRWFAddress = this.configService.get<string>('MOCK_RWF_CONTRACT_ADDRESS');
    const landParcelNFTAddress = this.configService.get<string>('LAND_PARCEL_NFT_CONTRACT_ADDRESS');

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Initialize contract instances with ABIs
    const expropriationABI = [
      'function flagParcelForExpropriation(uint256 tokenId, string memory reason, uint256 proposedCompensation) external',
      'function depositCompensation(uint256 tokenId) external payable',
      'function claimCompensation(uint256 tokenId) external',
      'function getEscrowedFunds(uint256 tokenId) view returns (uint256)',
      'function getCompensationDetails(uint256 tokenId) view returns (tuple(bool isFlagged, uint256 proposedAmount, uint256 escrowedAmount, bool compensationClaimed, address expropriatingAuthority, string reason))',
      'function cancelExpropriation(uint256 tokenId) external',
      'event ParcelFlaggedForExpropriation(uint256 indexed tokenId, address indexed authority, uint256 proposedCompensation)',
      'event CompensationDeposited(uint256 indexed tokenId, uint256 amount)',
      'event CompensationClaimed(uint256 indexed tokenId, address indexed owner, uint256 amount)',
      'event ExpropriationCompleted(uint256 indexed tokenId, address indexed newOwner)',
      'event ExpropriationCancelled(uint256 indexed tokenId)',
    ];

    const mockRWFABI = [
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function transferFrom(address from, address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
    ];

    const landParcelNFTABI = [
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function safeTransferFrom(address from, address to, uint256 tokenId)',
      'function exists(uint256 tokenId) view returns (bool)',
    ];

    this.expropriationContract = new ethers.Contract(expropriationAddress, expropriationABI, this.provider);
    this.mockRWFContract = new ethers.Contract(mockRWFAddress, mockRWFABI, this.provider);
    this.landParcelNFTContract = new ethers.Contract(landParcelNFTAddress, landParcelNFTABI, this.provider);
  }

  async createExpropriation(dto: CreateExpropriationDto): Promise<Expropriation> {
    // Validate parcel exists
    const parcel = await this.laisService.findOne(dto.parcelId);
    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${dto.parcelId} not found`);
    }

    // Check if parcel exists on-chain
    const tokenExists = await this.landParcelNFTContract.exists(parseInt(dto.parcelId));
    if (!tokenExists) {
      throw new BadRequestException(`Land parcel NFT with ID ${dto.parcelId} does not exist on-chain`);
    }

    // Upload expropriation documents to IPFS
    let reasonDocumentHash = dto.reasonDocumentHash;
    if (!reasonDocumentHash && dto.reasonDocument) {
      reasonDocumentHash = await this.ipfsService.uploadJson({
        title: dto.title,
        reason: dto.reason,
        legalBasis: dto.legalBasis,
        proposedCompensation: dto.proposedCompensation,
        timeline: dto.timeline,
        contactInformation: dto.contactInformation,
        document: dto.reasonDocument,
        createdAt: new Date().toISOString(),
      });
    }

    // Create expropriation record
    const expropriation = this.expropriationRepository.create({
      ...dto,
      reasonDocumentHash,
      flaggedDate: new Date(dto.flaggedDate),
      status: ExpropriationStatus.FLAGGED,
    });

    const savedExpropriation = await this.expropriationRepository.save(expropriation);

    // Flag parcel on smart contract
    try {
      const signer = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY'), this.provider);
      const contractWithSigner = this.expropriationContract.connect(signer);
      
      const tx = await contractWithSigner.flagParcelForExpropriation(
        parseInt(dto.parcelId),
        reasonDocumentHash || dto.reason,
        ethers.utils.parseEther(dto.proposedCompensation.toString())
      );
      
      const receipt = await tx.wait();
      
      // Update with transaction hash
      savedExpropriation.flagTransactionHash = receipt.transactionHash;
      await this.expropriationRepository.save(savedExpropriation);
    } catch (error) {
      console.error('Error flagging parcel on contract:', error);
      // Continue even if contract interaction fails
    }

    // Send notifications
    await this.notificationService.notifyExpropriationFlagged(savedExpropriation);

    return this.findOne(savedExpropriation.id);
  }

  async findAll(filters: ExpropriationFilterDto): Promise<PaginatedResult<Expropriation>> {
    const query = this.expropriationRepository.createQueryBuilder('expropriation');

    // Apply filters
    if (filters.parcelId) {
      query.andWhere('expropriation.parcelId = :parcelId', { parcelId: filters.parcelId });
    }

    if (filters.status) {
      query.andWhere('expropriation.status = :status', { status: filters.status });
    }

    if (filters.expropriatingAuthority) {
      query.andWhere('expropriation.expropriatingAuthority = :authority', { 
        authority: filters.expropriatingAuthority 
      });
    }

    if (filters.currentOwnerAddress) {
      query.andWhere('expropriation.currentOwnerAddress = :owner', { 
        owner: filters.currentOwnerAddress 
      });
    }

    if (filters.flaggedDateFrom) {
      query.andWhere('expropriation.flaggedDate >= :from', { from: filters.flaggedDateFrom });
    }

    if (filters.flaggedDateTo) {
      query.andWhere('expropriation.flaggedDate <= :to', { to: filters.flaggedDateTo });
    }

    if (filters.activeOnly) {
      query.andWhere('expropriation.status IN (:...activeStatuses)', { 
        activeStatuses: [ExpropriationStatus.FLAGGED, ExpropriationStatus.COMPENSATION_DEPOSITED] 
      });
    }

    if (filters.pendingCompensation) {
      query.andWhere('expropriation.status = :flaggedStatus', { 
        flaggedStatus: ExpropriationStatus.FLAGGED 
      });
    }

    // Add sorting
    query.orderBy(`expropriation.${filters.sortBy}`, filters.sortOrder);

    // Add pagination
    const skip = (filters.page - 1) * filters.limit;
    query.skip(skip).take(filters.limit);

    // Execute query
    const [expropriations, total] = await query.getManyAndCount();

    return {
      data: expropriations,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string): Promise<Expropriation> {
    const expropriation = await this.expropriationRepository.findOne({
      where: { id },
    });

    if (!expropriation) {
      throw new NotFoundException(`Expropriation with ID ${id} not found`);
    }

    return expropriation;
  }

  async findByParcel(parcelId: string): Promise<Expropriation[]> {
    return this.expropriationRepository.find({
      where: { parcelId },
      order: { flaggedDate: 'DESC' },
    });
  }

  async findByOwner(ownerAddress: string): Promise<Expropriation[]> {
    return this.expropriationRepository.find({
      where: { currentOwnerAddress: ownerAddress },
      order: { flaggedDate: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateExpropriationDto): Promise<Expropriation> {
    const expropriation = await this.findOne(id);

    // Update expropriation
    Object.assign(expropriation, {
      ...dto,
      flaggedDate: dto.flaggedDate ? new Date(dto.flaggedDate) : expropriation.flaggedDate,
      compensationDepositedDate: dto.compensationDepositedDate ? 
        new Date(dto.compensationDepositedDate) : expropriation.compensationDepositedDate,
      compensationClaimedDate: dto.compensationClaimedDate ? 
        new Date(dto.compensationClaimedDate) : expropriation.compensationClaimedDate,
      completedDate: dto.completedDate ? new Date(dto.completedDate) : expropriation.completedDate,
    });

    const updatedExpropriation = await this.expropriationRepository.save(expropriation);

    // Send notifications for status changes
    if (dto.status && dto.status !== expropriation.status) {
      await this.notificationService.notifyExpropriationStatusUpdate(updatedExpropriation);
    }

    return this.findOne(updatedExpropriation.id);
  }

  async depositCompensation(id: string, dto: DepositCompensationDto): Promise<Expropriation> {
    const expropriation = await this.findOne(id);

    if (expropriation.status !== ExpropriationStatus.FLAGGED) {
      throw new BadRequestException('Only flagged expropriations can have compensation deposited');
    }

    // Update expropriation record
    const updatedExpropriation = await this.update(id, {
      status: ExpropriationStatus.COMPENSATION_DEPOSITED,
      actualCompensation: dto.amount,
      compensationDepositedDate: new Date().toISOString(),
      depositTransactionHash: dto.transactionHash,
      notes: dto.notes,
    });

    // Deposit compensation on smart contract
    try {
      const signer = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY'), this.provider);
      const contractWithSigner = this.expropriationContract.connect(signer);
      
      await contractWithSigner.depositCompensation(parseInt(expropriation.parcelId), {
        value: ethers.utils.parseEther(dto.amount.toString())
      });
    } catch (error) {
      console.error('Error depositing compensation on contract:', error);
      // Continue even if contract interaction fails
    }

    // Send notifications
    await this.notificationService.notifyCompensationDeposited(updatedExpropriation);

    return updatedExpropriation;
  }

  async claimCompensation(id: string, dto: ClaimCompensationDto, claimerAddress: string): Promise<Expropriation> {
    const expropriation = await this.findOne(id);

    if (expropriation.status !== ExpropriationStatus.COMPENSATION_DEPOSITED) {
      throw new BadRequestException('Compensation must be deposited before it can be claimed');
    }

    if (expropriation.currentOwnerAddress !== claimerAddress) {
      throw new BadRequestException('Only the current owner can claim compensation');
    }

    // Update expropriation record
    const updatedExpropriation = await this.update(id, {
      status: ExpropriationStatus.COMPENSATION_CLAIMED,
      compensationClaimedDate: new Date().toISOString(),
      claimTransactionHash: dto.transactionHash,
      notes: dto.notes,
    });

    // Claim compensation on smart contract
    try {
      const signer = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY'), this.provider);
      const contractWithSigner = this.expropriationContract.connect(signer);
      
      await contractWithSigner.claimCompensation(parseInt(expropriation.parcelId));
    } catch (error) {
      console.error('Error claiming compensation on contract:', error);
      // Continue even if contract interaction fails
    }

    // Send notifications
    await this.notificationService.notifyCompensationClaimed(updatedExpropriation);

    return updatedExpropriation;
  }

  async completeExpropriation(id: string, dto: CompleteExpropriationDto): Promise<Expropriation> {
    const expropriation = await this.findOne(id);

    if (expropriation.status !== ExpropriationStatus.COMPENSATION_CLAIMED) {
      throw new BadRequestException('Compensation must be claimed before expropriation can be completed');
    }

    // Update expropriation record
    const updatedExpropriation = await this.update(id, {
      status: ExpropriationStatus.COMPLETED,
      completedDate: new Date().toISOString(),
      completionTransactionHash: dto.transactionHash,
      newOwnerAddress: dto.newOwnerAddress,
      notes: dto.notes,
    });

    // Transfer ownership on smart contract (if needed)
    try {
      const signer = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY'), this.provider);
      const nftContractWithSigner = this.landParcelNFTContract.connect(signer);
      
      await nftContractWithSigner.safeTransferFrom(
        expropriation.currentOwnerAddress,
        dto.newOwnerAddress,
        parseInt(expropriation.parcelId)
      );
    } catch (error) {
      console.error('Error transferring ownership on contract:', error);
      // Continue even if contract interaction fails
    }

    // Send notifications
    await this.notificationService.notifyExpropriationCompleted(updatedExpropriation);

    return updatedExpropriation;
  }

  async cancelExpropriation(id: string, reason: string): Promise<Expropriation> {
    const expropriation = await this.findOne(id);

    if (expropriation.status === ExpropriationStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed expropriation');
    }

    // Update expropriation record
    const updatedExpropriation = await this.update(id, {
      status: ExpropriationStatus.CANCELLED,
      cancellationReason: reason,
    });

    // Cancel on smart contract
    try {
      const signer = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY'), this.provider);
      const contractWithSigner = this.expropriationContract.connect(signer);
      
      await contractWithSigner.cancelExpropriation(parseInt(expropriation.parcelId));
    } catch (error) {
      console.error('Error cancelling expropriation on contract:', error);
      // Continue even if contract interaction fails
    }

    // Send notifications
    await this.notificationService.notifyExpropriationCancelled(updatedExpropriation);

    return updatedExpropriation;
  }

  async getExpropriationStatistics(): Promise<any> {
    const [
      totalExpropriations,
      flaggedExpropriations,
      compensationDepositedExpropriations,
      compensationClaimedExpropriations,
      completedExpropriations,
      cancelledExpropriations,
    ] = await Promise.all([
      this.expropriationRepository.count(),
      this.expropriationRepository.count({ where: { status: ExpropriationStatus.FLAGGED } }),
      this.expropriationRepository.count({ where: { status: ExpropriationStatus.COMPENSATION_DEPOSITED } }),
      this.expropriationRepository.count({ where: { status: ExpropriationStatus.COMPENSATION_CLAIMED } }),
      this.expropriationRepository.count({ where: { status: ExpropriationStatus.COMPLETED } }),
      this.expropriationRepository.count({ where: { status: ExpropriationStatus.CANCELLED } }),
    ]);

    const completionRate = totalExpropriations > 0 ? (completedExpropriations / totalExpropriations) * 100 : 0;

    // Calculate total compensation amounts
    const compensationStats = await this.expropriationRepository
      .createQueryBuilder('expropriation')
      .select('SUM(expropriation.proposedCompensation)', 'totalProposed')
      .addSelect('SUM(expropriation.actualCompensation)', 'totalActual')
      .addSelect('AVG(expropriation.proposedCompensation)', 'averageProposed')
      .addSelect('AVG(expropriation.actualCompensation)', 'averageActual')
      .where('expropriation.status != :cancelled', { cancelled: ExpropriationStatus.CANCELLED })
      .getRawOne();

    // Calculate average processing time
    const completedExpropriationsWithDates = await this.expropriationRepository
      .createQueryBuilder('expropriation')
      .where('expropriation.status = :status', { status: ExpropriationStatus.COMPLETED })
      .andWhere('expropriation.flaggedDate IS NOT NULL')
      .andWhere('expropriation.completedDate IS NOT NULL')
      .getMany();

    let averageProcessingDays = 0;
    if (completedExpropriationsWithDates.length > 0) {
      const totalDays = completedExpropriationsWithDates.reduce((sum, expropriation) => {
        const flaggedDate = new Date(expropriation.flaggedDate);
        const completedDate = new Date(expropriation.completedDate);
        const diffTime = Math.abs(completedDate.getTime() - flaggedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      averageProcessingDays = Math.round(totalDays / completedExpropriationsWithDates.length);
    }

    return {
      totalExpropriations,
      flaggedExpropriations,
      compensationDepositedExpropriations,
      compensationClaimedExpropriations,
      completedExpropriations,
      cancelledExpropriations,
      completionRate: Math.round(completionRate * 100) / 100,
      averageProcessingDays,
      compensation: {
        totalProposed: parseFloat(compensationStats.totalProposed) || 0,
        totalActual: parseFloat(compensationStats.totalActual) || 0,
        averageProposed: parseFloat(compensationStats.averageProposed) || 0,
        averageActual: parseFloat(compensationStats.averageActual) || 0,
      },
    };
  }

  // Smart contract interaction methods
  async getEscrowedFunds(tokenId: number): Promise<string> {
    try {
      const amount = await this.expropriationContract.getEscrowedFunds(tokenId);
      return ethers.utils.formatEther(amount);
    } catch (error) {
      console.error('Error getting escrowed funds:', error);
      return '0';
    }
  }

  async getCompensationStatus(tokenId: number): Promise<any> {
    try {
      const details = await this.expropriationContract.getCompensationDetails(tokenId);
      return {
        isFlagged: details.isFlagged,
        proposedAmount: ethers.utils.formatEther(details.proposedAmount),
        escrowedAmount: ethers.utils.formatEther(details.escrowedAmount),
        compensationClaimed: details.compensationClaimed,
        expropriatingAuthority: details.expropriatingAuthority,
        reason: details.reason,
      };
    } catch (error) {
      console.error('Error getting compensation status:', error);
      return null;
    }
  }

  async syncWithChain(id: string): Promise<Expropriation> {
    const expropriation = await this.findOne(id);
    const onChainStatus = await this.getCompensationStatus(parseInt(expropriation.parcelId));

    if (onChainStatus) {
      let status = expropriation.status;
      
      if (onChainStatus.compensationClaimed && expropriation.status !== ExpropriationStatus.COMPENSATION_CLAIMED) {
        status = ExpropriationStatus.COMPENSATION_CLAIMED;
      } else if (parseFloat(onChainStatus.escrowedAmount) > 0 && expropriation.status === ExpropriationStatus.FLAGGED) {
        status = ExpropriationStatus.COMPENSATION_DEPOSITED;
      }

      return await this.update(id, {
        status,
        actualCompensation: parseFloat(onChainStatus.escrowedAmount),
      });
    }

    return expropriation;
  }

  // Document management methods
  async getExpropriationDocuments(id: string): Promise<any> {
    const expropriation = await this.findOne(id);
    
    if (expropriation.reasonDocumentHash) {
      try {
        const document = await this.ipfsService.getContent(expropriation.reasonDocumentHash);
        return {
          reasonDocument: document,
          hash: expropriation.reasonDocumentHash,
        };
      } catch (error) {
        console.error('Error retrieving document from IPFS:', error);
        return null;
      }
    }

    return null;
  }

  async getDocumentFromIPFS(hash: string): Promise<any> {
    try {
      return await this.ipfsService.getContent(hash);
    } catch (error) {
      console.error('Error retrieving document from IPFS:', error);
      throw new NotFoundException('Document not found');
    }
  }

  // Reporting methods
  async getMonthlyReport(year?: number, month?: number): Promise<any> {
    const currentDate = new Date();
    const reportYear = year || currentDate.getFullYear();
    const reportMonth = month || currentDate.getMonth() + 1;

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);

    const expropriations = await this.expropriationRepository
      .createQueryBuilder('expropriation')
      .where('expropriation.flaggedDate >= :startDate', { startDate })
      .andWhere('expropriation.flaggedDate <= :endDate', { endDate })
      .getMany();

    const summary = {
      period: `${reportYear}-${reportMonth.toString().padStart(2, '0')}`,
      totalExpropriations: expropriations.length,
      byStatus: {},
      totalCompensation: 0,
      averageCompensation: 0,
    };

    // Group by status
    expropriations.forEach(exp => {
      summary.byStatus[exp.status] = (summary.byStatus[exp.status] || 0) + 1;
      if (exp.actualCompensation) {
        summary.totalCompensation += exp.actualCompensation;
      }
    });

    summary.averageCompensation = expropriations.length > 0 ? 
      summary.totalCompensation / expropriations.length : 0;

    return {
      summary,
      expropriations,
    };
  }

  async getCompensationSummary(): Promise<any> {
    const result = await this.expropriationRepository
      .createQueryBuilder('expropriation')
      .select('expropriation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(expropriation.proposedCompensation)', 'totalProposed')
      .addSelect('SUM(expropriation.actualCompensation)', 'totalActual')
      .addSelect('AVG(expropriation.proposedCompensation)', 'avgProposed')
      .addSelect('AVG(expropriation.actualCompensation)', 'avgActual')
      .groupBy('expropriation.status')
      .getRawMany();

    return result.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      totalProposed: parseFloat(row.totalProposed) || 0,
      totalActual: parseFloat(row.totalActual) || 0,
      averageProposed: parseFloat(row.avgProposed) || 0,
      averageActual: parseFloat(row.avgActual) || 0,
    }));
  }
}

