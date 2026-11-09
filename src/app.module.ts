import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './global/prisma.module';
import { MailModule } from './mail/mail.module';
import { GeoModule } from './geo/geo.module';
import { PlanosModule } from './planos/planos.module';
import { AuthModule } from './auth/auth.module';
import { AssinaturaModule } from './assinatura/assinatura.module';
import { IgrejasModule } from './igrejas/igrejas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CelulasModule } from './celulas/celulas.module';
import { MembrosModule } from './membros/membros.module';
import { TriagemModule } from './triagem/triagem.module';
import { ListaEsperaModule } from './lista-espera/lista-espera.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { BuscaModule } from './busca/busca.module';
import { PlataformaModule } from './plataforma/plataforma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // limite geral por IP (rotas sensíveis têm limites próprios com @Throttle)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    PrismaModule,
    MailModule,
    GeoModule,
    PlanosModule,
    AuthModule,
    AssinaturaModule,
    IgrejasModule,
    UsuariosModule,
    CelulasModule,
    MembrosModule,
    TriagemModule,
    ListaEsperaModule,
    NotificacoesModule,
    FeedbacksModule,
    RelatoriosModule,
    BuscaModule,
    PlataformaModule,
  ],
  // ThrottlerGuard roda antes do AuthGuard (registrado no AuthModule)
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
