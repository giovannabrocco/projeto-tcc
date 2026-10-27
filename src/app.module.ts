import { Module } from '@nestjs/common';
import { PrismaModule } from './global/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsuarioModule } from './usuario/usuario.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    UsuarioModule,
  ],
  controllers: [],
})
export class AppModule {}
