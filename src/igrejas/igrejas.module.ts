import { Module } from '@nestjs/common';
import { AssinaturaModule } from '../assinatura/assinatura.module';
import { IgrejasController } from './igrejas.controller';
import { IgrejasService } from './igrejas.service';

@Module({ imports: [AssinaturaModule], controllers: [IgrejasController], providers: [IgrejasService] })
export class IgrejasModule {}
