import { Module } from '@nestjs/common';
import { ListaEsperaModule } from '../lista-espera/lista-espera.module';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

@Module({ imports: [ListaEsperaModule], controllers: [NotificacoesController], providers: [NotificacoesService] })
export class NotificacoesModule {}
