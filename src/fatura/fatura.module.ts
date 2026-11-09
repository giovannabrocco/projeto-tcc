import { Module } from '@nestjs/common';
import { FaturaService } from './fatura.service';

@Module({
  controllers: [],
  providers: [FaturaService],
})
export class FaturaModule {}
