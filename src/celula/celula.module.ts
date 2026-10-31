import { Module } from '@nestjs/common';
import { CelulaService } from './celula.service';
import { CelulaController } from './celula.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [CelulaController],
  providers: [CelulaService],
  imports: [HttpModule],
})
export class CelulaModule {}
