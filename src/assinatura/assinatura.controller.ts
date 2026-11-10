import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Perfis, Public, SemBloqueio, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { AssinaturaService } from './assinatura.service';
import { CheckoutDto, TrocarPlanoDto } from './assinatura.dto';
import { MercadoPagoService } from './mercadopago.service';
import { PrismaService } from '../global/prisma.service';
import { falhar } from '../common/api-exception';

/** Todas as rotas de cobrança funcionam MESMO com o sistema bloqueado (@SemBloqueio) — é como se regulariza. */
@Controller('assinatura')
@SemBloqueio()
@Perfis('ADMINISTRADOR')
export class AssinaturaController {
  constructor(private readonly assinatura: AssinaturaService) {}

  @Get()
  obter(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.assinatura.obter(u.idIgreja);
  }

  /** Valida o cupom para mostrar o desconto na tela de planos (pública). */
  @Public()
  @Get('cupom/:codigo')
  cupom(@Param('codigo') codigo: string) {
    return this.assinatura.validarCupom(codigo);
  }

  @Post('checkout')
  checkout(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CheckoutDto) {
    return this.assinatura.checkout(u, dto);
  }

  @Post('sincronizar')
  @HttpCode(200)
  sincronizar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.assinatura.sincronizar(u.idIgreja);
  }

  @Post('plano')
  @HttpCode(200)
  trocarPlano(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: TrocarPlanoDto) {
    return this.assinatura.trocarPlano(u, dto.plano);
  }

  @Post('cancelar')
  @HttpCode(200)
  cancelar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.assinatura.cancelar(u);
  }
}

/** Webhook do Mercado Pago — configure a URL em "Suas integrações > Webhooks": POST /api/pagamentos/webhook */
@Controller('pagamentos')
export class PagamentosController {
  constructor(
    private readonly assinatura: AssinaturaService,
    private readonly mp: MercadoPagoService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() body: any,
    @Query() query: Record<string, string>,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const dataId = String(query['data.id'] ?? body?.data?.id ?? query.id ?? '');
    const tipo = String(body?.type ?? query.type ?? query.topic ?? '');
    if (!dataId || !tipo) return { ok: true }; // ping de teste do painel do MP

    if (!this.mp.assinaturaWebhookValida({ xSignature, xRequestId, dataId })) {
      falhar(401, 'Assinatura do webhook inválida.');
    }

    const evento = await this.prisma.evento_Pagamento.create({
      data: { tipo, mp_id: dataId, acao: body?.action ?? null, payload: body ?? {} },
    });
    try {
      await this.assinatura.processarWebhook(tipo, dataId);
      await this.prisma.evento_Pagamento.update({ where: { id_evento: evento.id_evento }, data: { processado_em: new Date() } });
    } catch (e) {
      await this.prisma.evento_Pagamento.update({ where: { id_evento: evento.id_evento }, data: { erro: String((e as Error).message).slice(0, 500) } });
      // id que o MP não conhece (ex.: simulação do painel): responder 200, reenviar não adianta
      if ((e as any)?.getResponse?.()?.codigo === 'MP_NAO_ENCONTRADO') return { ok: true, ignorado: true };
      throw e; // 5xx => o Mercado Pago reenvia o webhook
    }
    return { ok: true };
  }
}
