import { Module } from '@nestjs/common';
import { CelulaService } from './celula.service';
import { CelulaController } from './celula.controller';

@Module({
  controllers: [CelulaController],
  providers: [CelulaService],
})
export class CelulaModule {}
