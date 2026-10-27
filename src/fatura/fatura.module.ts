import { Module } from '@nestjs/common';
import { FaturaService } from './fatura.service';
import { FaturaController } from './fatura.controller';

@Module({
  controllers: [FaturaController],
  providers: [FaturaService],
})
export class FaturaModule {}
