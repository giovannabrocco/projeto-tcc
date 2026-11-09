import { Module } from '@nestjs/common';
import { TriagemModule } from '../triagem/triagem.module';
import { ListaEsperaController } from './lista-espera.controller';
import { ListaEsperaService } from './lista-espera.service';

@Module({
  imports: [TriagemModule],
  controllers: [ListaEsperaController],
  providers: [ListaEsperaService],
  exports: [ListaEsperaService],
})
export class ListaEsperaModule {}
