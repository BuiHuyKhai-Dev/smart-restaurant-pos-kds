import { Module } from '@nestjs/common';
import { BomService } from './bom.service';
import { BomController } from './bom.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BomController],
  providers: [BomService],
  exports: [BomService],
})
export class BomModule {}

