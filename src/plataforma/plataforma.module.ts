import { Module } from '@nestjs/common';
import { PlataformaController } from './plataforma.controller';
import { PlataformaGuard } from './plataforma.guard';

@Module({ controllers: [PlataformaController], providers: [PlataformaGuard] })
export class PlataformaModule {}
