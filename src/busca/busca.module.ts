import { Module } from '@nestjs/common';
import { BuscaController, BuscaService } from './busca.controller';

@Module({ controllers: [BuscaController], providers: [BuscaService] })
export class BuscaModule {}
