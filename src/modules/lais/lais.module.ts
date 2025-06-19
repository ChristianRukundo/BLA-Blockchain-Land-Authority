import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaisController } from './lais.controller';
import { LaisService } from './lais.service';
import { LandParcel } from './entities/land-parcel.entity';
import { CadastralData } from './entities/cadastral-data.entity';
import { LandUseZone } from './entities/land-use-zone.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LandParcel,
      CadastralData,
      LandUseZone,
    ]),
  ],
  controllers: [LaisController],
  providers: [LaisService],
  exports: [LaisService],
})
export class LaisModule {}
