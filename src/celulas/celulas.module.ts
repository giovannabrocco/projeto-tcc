import { Module } from '@nestjs/common';
import { CelulasController } from './celulas.controller';
import { CelulasService } from './celulas.service';

@Module({ controllers: [CelulasController], providers: [CelulasService], exports: [CelulasService] })
export class CelulasModule {}
