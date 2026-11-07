import { Module } from '@nestjs/common';
import { PrismaModule } from './global/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsuarioModule } from './usuario/usuario.module';
import { IgrejaModule } from './igreja/igreja.module';
import { CelulaModule } from './celula/celula.module';
import { MembroModule } from './membro/membro.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    UsuarioModule,
    IgrejaModule,
    CelulaModule,
    MembroModule,
  ],
  controllers: [],
})
export class AppModule {}
