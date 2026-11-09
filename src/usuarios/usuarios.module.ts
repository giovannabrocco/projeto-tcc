import { Module } from '@nestjs/common';
import { LideresController, UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({ controllers: [UsuariosController, LideresController], providers: [UsuariosService] })
export class UsuariosModule {}
