import { Global, Module } from '@nestjs/common';
import { PlanosController } from './planos.controller';
import { PlanosService } from './planos.service';

@Global()
@Module({ controllers: [PlanosController], providers: [PlanosService], exports: [PlanosService] })
export class PlanosModule {}
