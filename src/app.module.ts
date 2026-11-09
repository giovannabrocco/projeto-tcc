import { Module } from '@nestjs/common';
import { PrismaModule } from './global/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsuarioModule } from './usuario/usuario.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PromocaoModule } from './promocao/promocao.module';
import { MembroModule } from './membro/membro.module';
import { IgrejaModule } from './igreja/igreja.module';
import { CelulaModule } from './celula/celula.module';
import { AssinaturaModule } from './assinatura/assinatura.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    UsuarioModule,
    PromocaoModule,
    MembroModule,
    IgrejaModule,
    CelulaModule,
    AssinaturaModule,
    AuthModule,
  ],
  controllers: [],
})
export class AppModule {}
