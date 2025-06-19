import { DataSource } from 'typeorm';
import { LandParcel, LandUseType, ParcelStatus, ComplianceStatus } from '../entities/land-parcel.entity';
import { User } from '../entities/user.entity';

export class LandParcelSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const landParcelRepository = dataSource.getRepository(LandParcel);
    const userRepository = dataSource.getRepository(User);

    // Check if land parcels already exist
    const existingParcels = await landParcelRepository.count();
    if (existingParcels > 0) {
      console.log('🏞️ Land parcels already exist, skipping land parcel seeding');
      return;
    }

    console.log('🏞️ Seeding land parcels...');

    // Get users to assign as owners
    const users = await userRepository.find({
      where: { isActive: true },
      relations: ['profiles'],
    });

    if (users.length === 0) {
      console.log('❌ No users found, cannot seed land parcels');
      return;
    }

    // Rwanda districts and their coordinates (approximate centers)
    const rwandaLocations = [
      {
        district: 'Kigali',
        sector: 'Gasabo',
        cell: 'Kimisagara',
        village: 'Nyabugogo',
        lat: -1.9441,
        lng: 30.0619,
      },
      {
        district: 'Kigali',
        sector: 'Nyarugenge',
        cell: 'Rwampara',
        village: 'Rwampara',
        lat: -1.9536,
        lng: 30.0605,
      },
      {
        district: 'Kigali',
        sector: 'Kicukiro',
        cell: 'Kabuga',
        village: 'Kabuga',
        lat: -1.9659,
        lng: 30.1044,
      },
      {
        district: 'Rwamagana',
        sector: 'Kigabiro',
        cell: 'Kigabiro',
        village: 'Kigabiro',
        lat: -1.9333,
        lng: 30.4333,
      },
      {
        district: 'Huye',
        sector: 'Tumba',
        cell: 'Tumba',
        village: 'Tumba',
        lat: -2.5167,
        lng: 29.7333,
      },
      {
        district: 'Musanze',
        sector: 'Muhoza',
        cell: 'Muhoza',
        village: 'Muhoza',
        lat: -1.4833,
        lng: 29.6333,
      },
      {
        district: 'Rubavu',
        sector: 'Gisenyi',
        cell: 'Gisenyi',
        village: 'Gisenyi',
        lat: -1.7000,
        lng: 29.2667,
      },
      {
        district: 'Nyagatare',
        sector: 'Nyagatare',
        cell: 'Nyagatare',
        village: 'Nyagatare',
        lat: -1.3000,
        lng: 30.3333,
      },
    ];

    const landUseTypes = Object.values(LandUseType);
    const parcelStatuses = Object.values(ParcelStatus);
    const complianceStatuses = Object.values(ComplianceStatus);

    // Create land parcels
    for (let i = 0; i < 50; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const location = rwandaLocations[Math.floor(Math.random() * rwandaLocations.length)];
      const landUse = landUseTypes[Math.floor(Math.random() * landUseTypes.length)];
      const status = parcelStatuses[Math.floor(Math.random() * parcelStatuses.length)];
      const complianceStatus = complianceStatuses[Math.floor(Math.random() * complianceStatuses.length)];

      // Generate random area between 100 and 10000 square meters
      const area = Math.floor(Math.random() * 9900) + 100;
      
      // Generate estimated value based on area and location (Kigali is more expensive)
      const basePrice = location.district === 'Kigali' ? 50000 : 20000; // RWF per sq meter
      const estimatedValue = area * basePrice * (0.8 + Math.random() * 0.4); // ±20% variation

      // Generate compliance score
      const complianceScore = Math.floor(Math.random() * 100);

      // Create boundary polygon (simple square around the center point)
      const offset = 0.001; // Approximately 100 meters
      const boundaryCoordinates = [
        [location.lng - offset, location.lat - offset],
        [location.lng + offset, location.lat - offset],
        [location.lng + offset, location.lat + offset],
        [location.lng - offset, location.lat + offset],
        [location.lng - offset, location.lat - offset], // Close the polygon
      ];

      const landParcel = landParcelRepository.create({
        parcelId: `LP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        ownerAddress: user.walletAddress,
        ownerName: user.profiles?.[0]?.fullName || `${user.email.split('@')[0]}`,
        ownerEmail: user.email,
        ownerPhone: user.profiles?.[0]?.phoneNumber,
        landUse,
        status,
        complianceStatus,
        area,
        estimatedValue,
        address: `${location.cell}, ${location.sector}`,
        district: location.district,
        sector: location.sector,
        cell: location.cell,
        village: location.village,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat],
        },
        boundary: {
          type: 'Polygon',
          coordinates: [boundaryCoordinates],
        },
        tokenId: String(i + 1),
        tokenURI: `ipfs://QmHash${i + 1}`,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: String(Math.floor(Math.random() * 1000000) + 18000000),
        complianceScore,
        lastInspectionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in last year
        nextInspectionDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in next year
        totalFines: Math.random() > 0.7 ? Math.floor(Math.random() * 500000) : 0, // 30% chance of fines
        totalEcoCredits: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : 0, // 50% chance of eco credits
        documents: [
          {
            id: `doc-${i + 1}-1`,
            name: 'Land Title Certificate',
            type: 'title',
            hash: `ipfs://QmDoc${i + 1}Title`,
            uploadedAt: new Date().toISOString(),
            verified: true,
          },
          {
            id: `doc-${i + 1}-2`,
            name: 'Survey Report',
            type: 'survey',
            hash: `ipfs://QmDoc${i + 1}Survey`,
            uploadedAt: new Date().toISOString(),
            verified: Math.random() > 0.2, // 80% verified
          },
        ],
        complianceReports: [
          {
            id: `report-${i + 1}-1`,
            score: complianceScore,
            inspector: 'RLMUA Inspector',
            reportDate: new Date().toISOString(),
            findings: complianceScore > 80 ? 'No major issues found' : 'Minor compliance issues detected',
            recommendations: complianceScore > 80 ? 'Continue current practices' : 'Address identified issues',
          },
        ],
        metadata: {
          soilType: ['clay', 'loam', 'sand'][Math.floor(Math.random() * 3)],
          elevation: Math.floor(Math.random() * 2000) + 1000, // 1000-3000m elevation
          waterAccess: Math.random() > 0.3,
          roadAccess: Math.random() > 0.2,
          electricityAccess: Math.random() > 0.4,
          nearbyAmenities: ['school', 'hospital', 'market', 'church'].filter(() => Math.random() > 0.5),
        },
        description: `${landUse.replace('_', ' ')} land parcel in ${location.district} district`,
        notes: Math.random() > 0.7 ? 'Additional notes about this parcel' : null,
        isActive: true,
      });

      // Add inheritance data for some parcels
      if (Math.random() > 0.7) { // 30% chance
        const potentialHeirs = users.filter(u => u.id !== user.id);
        if (potentialHeirs.length > 0) {
          const heir = potentialHeirs[Math.floor(Math.random() * potentialHeirs.length)];
          landParcel.nominatedHeir = heir.walletAddress;
          landParcel.heirDetails = {
            name: heir.profiles?.[0]?.fullName || heir.email.split('@')[0],
            relationship: ['spouse', 'child', 'parent', 'sibling'][Math.floor(Math.random() * 4)],
            contactInfo: {
              email: heir.email,
              phone: heir.profiles?.[0]?.phoneNumber,
            },
            nominatedAt: new Date().toISOString(),
          };
          landParcel.inheritanceActive = Math.random() > 0.5;
        }
      }

      await landParcelRepository.save(landParcel);
    }

    console.log(`✅ Created ${await landParcelRepository.count()} land parcels`);

    // Create some sample expropriations
    const parcelsForExpropriation = await landParcelRepository.find({
      take: 3,
      order: { createdAt: 'ASC' },
    });

    if (parcelsForExpropriation.length > 0) {
      // Import here to avoid circular dependency
      const { Expropriation, ExpropriationStatus, ExpropriationReason } = await import('../entities/expropriation.entity');
      const expropriationRepository = dataSource.getRepository(Expropriation);

      for (const parcel of parcelsForExpropriation) {
        const expropriation = expropriationRepository.create({
          landParcelId: parcel.id,
          parcelId: parcel.parcelId,
          ownerAddress: parcel.ownerAddress,
          initiatedBy: '0x1234567890123456789012345678901234567890', // Admin address
          status: [
            ExpropriationStatus.FLAGGED,
            ExpropriationStatus.UNDER_REVIEW,
            ExpropriationStatus.APPROVED,
          ][Math.floor(Math.random() * 3)],
          reason: [
            ExpropriationReason.PUBLIC_INFRASTRUCTURE,
            ExpropriationReason.URBAN_DEVELOPMENT,
            ExpropriationReason.ENVIRONMENTAL_PROTECTION,
          ][Math.floor(Math.random() * 3)],
          description: 'Land required for public infrastructure development project',
          reasonDocumentHash: `ipfs://QmExpropriationReason${parcel.id}`,
          proposedCompensation: parcel.estimatedValue * 1.2, // 20% above estimated value
          timeline: [
            {
              timestamp: new Date().toISOString(),
              event: 'Expropriation initiated',
              details: 'Land flagged for public infrastructure project',
              status: ExpropriationStatus.FLAGGED,
            },
          ],
          metadata: {
            projectName: 'Rwanda Infrastructure Development Project',
            projectType: 'Road Construction',
            expectedCompletionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });

        await expropriationRepository.save(expropriation);

        // Update parcel status if expropriated
        if (Math.random() > 0.5) {
          parcel.status = ParcelStatus.EXPROPRIATED;
          await landParcelRepository.save(parcel);
        }
      }

      console.log(`✅ Created ${await expropriationRepository.count()} sample expropriations`);
    }
  }
}

