import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Assinatura, Plano, StatusFatura } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { MailService } from '../mail/mail.service';
import { PlanosService, limitesDoPlano, mapPlano } from '../planos/planos.service';
import { UsuarioAutenticado } from '../common/types';
import { falhar } from '../common/api-exception';
import { addMeses, isoData } from '../common/util';
import { env } from '../config/env';
import { MercadoPagoService, MpPagamentoRecorrente, MpPreapproval } from './mercadopago.service';
import { avaliarAcesso, resumoAcesso } from './situacao';

const r2 = (n: number) => Math.round(n * 100) / 100;
const dataOuNulo = (s?: string | null) => (s ? new Date(s) : null);

/** external_reference enviado ao MP: "igreja:12|plano:PREMIUM|cupom:BEMVINDO" */
const montarRef = (idIgreja: number, plano: string, cupom?: string) =>
  `igreja:${idIgreja}|plano:${plano}${cupom ? `|cupom:${cupom}` : ''}`;
function lerRef(ref?: string) {
  const m = Object.fromEntries((ref ?? '').split('|').map((p) => p.split(':') as [string, string]));
  return { idIgreja: m.igreja ? Number(m.igreja) : null, plano: m.plano ?? null, cupom: m.cupom ?? null };
}

@Injectable()
export class AssinaturaService {
  private readonly logger = new Logger('Assinatura');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoService,
    private readonly planos: PlanosService,
    private readonly mail: MailService,
  ) {}

  // ------------------------------------------------------------------ consulta
  private async carregar(idIgreja: number) {
    const ass = await this.prisma.assinatura.findUnique({
      where: { id_igreja: idIgreja },
      include: { Plano: true, PlanoPendente: true },
    });
    if (!ass) falhar(404, 'Assinatura não encontrada.');
    return ass;
  }

  async obter(idIgreja: number) {
    const ass = await this.carregar(idIgreja);
    const [uso, faturas, desconto] = await Promise.all([
      this.planos.usoDaIgreja(idIgreja),
      this.prisma.fatura.findMany({
        where: { id_assinatura: ass.id_assinatura },
        orderBy: { dta_vencimento: 'desc' },
        take: 12,
      }),
      this.prisma.desconto.findFirst({ where: { id_assinatura: ass.id_assinatura }, include: { Promocao: true } }),
    ]);
    const acesso = resumoAcesso(ass);
    const assinanteMp = !!ass.mp_preapproval_id && ass.mp_status === 'authorized' && ['ATIVA', 'ATRASADA'].includes(ass.status);
    return {
      idAssinatura: ass.id_assinatura,
      ...acesso,
      planoId: ass.id_plano,
      plano: mapPlano(ass.Plano),
      planoPendente: ass.PlanoPendente ? mapPlano(ass.PlanoPendente) : null,
      valorCobrado: ass.valor_cobrado !== null ? Number(ass.valor_cobrado) : null,
      cupom: desconto ? { codigo: desconto.Promocao.codigo, percDesconto: desconto.perc_aplicado } : null,
      inicioTeste: ass.dta_inicio_teste?.toISOString() ?? null,
      fimTeste: ass.dta_fim_teste?.toISOString() ?? null,
      vencimento: ass.dtavencimento?.toISOString() ?? null,
      ultimoPagamento: ass.dtaultpagamento?.toISOString() ?? null,
      dataCancelamento: ass.dta_cancelamento?.toISOString() ?? null,
      formaCobranca: ass.mp_preapproval_id ? 'MERCADO_PAGO' : null,
      mpStatus: ass.mp_status,
      podeFazerCheckout: !assinanteMp,
      podeCancelar: !['CANCELADA', 'EXPIRADA'].includes(acesso.status),
      pagamentosHabilitados: this.mp.configurado,
      uso,
      limites: limitesDoPlano(ass.Plano),
      faturas: faturas.map((f) => ({
        idFatura: f.id_fatura,
        mes: f.mes,
        ano: f.ano,
        plano: f.id_plano,
        vencimento: isoData(f.dta_vencimento),
        pagoEm: f.dtahor_pagamento?.toISOString() ?? null,
        valorTotal: Number(f.vlrtotal),
        valorPago: Number(f.vlrapagar),
        status: f.status,
        motivoRecusa: f.motivo_recusa,
      })),
    };
  }

  // ------------------------------------------------------------------ cupom
  async validarCupom(codigo: string) {
    const agora = new Date();
    const p = await this.prisma.promocao.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });
    const valido =
      !!p && p.ativo && p.dtainicio <= agora && p.dtaexpiracao >= agora && (p.max_usos === null || p.total_usos < p.max_usos);
    return valido
      ? { valido: true as const, codigo: p.codigo, percDesconto: p.perc_desconto, descricao: p.descricao }
      : { valido: false as const, codigo: codigo.trim().toUpperCase(), percDesconto: 0, descricao: '' };
  }

  // ------------------------------------------------------------------ checkout (assinar / reativar)
  async checkout(u: UsuarioAutenticado, p: { plano: string; cupom?: string; emailPagador?: string }) {
    const ass = await this.carregar(u.idIgreja);
    if (ass.mp_preapproval_id && ass.mp_status === 'authorized' && ['ATIVA', 'ATRASADA'].includes(ass.status)) {
      falhar(409, 'Sua igreja já possui uma assinatura ativa. Para mudar o plano use "Trocar plano".', {
        codigo: 'JA_ASSINANTE',
      });
    }
    const plano = await this.planos.obterAtivo(p.plano);
    await this.exigirUsoCabe(u.idIgreja, plano);

    let perc = 0;
    let cupom: string | undefined;
    if (p.cupom?.trim()) {
      const c = await this.validarCupom(p.cupom);
      if (!c.valido) falhar(400, 'Cupom inválido ou expirado.', { campos: { cupom: 'Cupom inválido ou expirado.' } });
      perc = c.percDesconto;
      cupom = c.codigo;
    }
    const valor = r2(Number(plano.valor) * (1 - perc / 100));
    const email = (p.emailPagador ?? u.email).trim().toLowerCase();

    const igreja = await this.prisma.igreja.findUnique({ where: { id_igreja: u.idIgreja } });
    const mpAss = await this.mp.criarAssinatura({
      motivo: `Conectus — Plano ${plano.nome} — ${igreja.nome_igreja}`.slice(0, 250),
      referencia: montarRef(u.idIgreja, plano.id_plano, cupom),
      emailPagador: email,
      valor,
    });
    await this.prisma.assinatura.update({
      where: { id_assinatura: ass.id_assinatura },
      data: { mp_preapproval_id: mpAss.id, mp_status: mpAss.status, email_pagador: email, valor_cobrado: valor },
    });
    return { initPoint: mpAss.init_point, idAssinaturaMp: mpAss.id, plano: plano.id_plano, valor, percDesconto: perc };
  }

  /** Chamado pelo front ao voltar do checkout (back_url) para não depender só do webhook. */
  async sincronizar(idIgreja: number) {
    const ass = await this.carregar(idIgreja);
    if (ass.mp_preapproval_id && this.mp.configurado) {
      await this.aplicarPreapproval(await this.mp.obterAssinatura(ass.mp_preapproval_id));
    }
    return this.obter(idIgreja);
  }

  // ------------------------------------------------------------------ troca de plano
  private async exigirUsoCabe(idIgreja: number, plano: Plano) {
    const uso = await this.planos.usoDaIgreja(idIgreja);
    const excede = this.planos.excedidos(uso, limitesDoPlano(plano));
    if (excede.length) {
      falhar(
        409,
        `O uso atual (${excede.map((k) => `${uso[k]} ${k}`).join(', ')}) excede o plano ${plano.nome}. Reduza o uso antes de trocar.`,
        { codigo: 'USO_EXCEDE_PLANO' },
      );
    }
  }

  /**
   * - Em TESTE: troca na hora (ainda não há cobrança).
   * - Assinante ativo: UPGRADE vale na hora (limites maiores); DOWNGRADE vale no fim do período já pago.
   *   Em ambos o novo valor passa a ser cobrado no próximo ciclo (sem cobrança proporcional).
   * - Sem assinatura ativa (cancelada/expirada): precisa passar pelo checkout.
   */
  async trocarPlano(u: UsuarioAutenticado, idPlanoNovo: string) {
    const ass = await this.carregar(u.idIgreja);
    const novo = await this.planos.obterAtivo(idPlanoNovo);
    if (novo.id_plano === ass.id_plano && !ass.id_plano_pendente) falhar(400, 'A igreja já está neste plano.');
    await this.exigirUsoCabe(u.idIgreja, novo);

    const sit = avaliarAcesso(ass);
    const assinanteMp = !!ass.mp_preapproval_id && ass.mp_status === 'authorized' && ['ATIVA', 'ATRASADA'].includes(ass.status);

    if (sit.status === 'TESTE') {
      await this.prisma.assinatura.update({ where: { id_assinatura: ass.id_assinatura }, data: { id_plano: novo.id_plano } });
      return { ...(await this.obter(u.idIgreja)), mensagem: `Plano alterado para ${novo.nome}.` };
    }
    if (!assinanteMp) {
      falhar(409, 'Para contratar um plano é necessário concluir o pagamento.', { codigo: 'CHECKOUT_NECESSARIO' });
    }

    const desc = await this.prisma.desconto.findFirst({ where: { id_assinatura: ass.id_assinatura } });
    const valor = r2(Number(novo.valor) * (1 - (desc?.perc_aplicado ?? 0) / 100));
    await this.mp.atualizarValor(ass.mp_preapproval_id, valor);

    const upgrade = Number(novo.valor) > Number(ass.Plano.valor);
    await this.prisma.assinatura.update({
      where: { id_assinatura: ass.id_assinatura },
      data: upgrade
        ? { id_plano: novo.id_plano, id_plano_pendente: null, valor_cobrado: valor }
        : { id_plano_pendente: novo.id_plano, valor_cobrado: valor },
    });
    return {
      ...(await this.obter(u.idIgreja)),
      mensagem: upgrade
        ? `Upgrade para ${novo.nome} aplicado. O novo valor (R$ ${valor.toFixed(2)}) será cobrado a partir da próxima fatura.`
        : `Downgrade para ${novo.nome} agendado para o fim do período pago (${isoData(ass.dtavencimento) ?? 'próxima cobrança'}).`,
    };
  }

  // ------------------------------------------------------------------ cancelamento
  async cancelar(u: UsuarioAutenticado) {
    const ass = await this.carregar(u.idIgreja);
    if (['CANCELADA', 'EXPIRADA'].includes(avaliarAcesso(ass).status) && ass.status !== 'TESTE') {
      falhar(409, 'A assinatura já está cancelada ou expirada.');
    }
    if (ass.mp_preapproval_id && ass.mp_status === 'authorized') await this.mp.cancelar(ass.mp_preapproval_id);

    await this.prisma.assinatura.update({
      where: { id_assinatura: ass.id_assinatura },
      data: {
        status: 'CANCELADA',
        mp_status: ass.mp_preapproval_id ? 'cancelled' : ass.mp_status,
        dta_cancelamento: new Date(),
        id_plano_pendente: null,
        // acesso continua até o fim do período já pago (ou do teste)
        dtavencimento: ass.status === 'TESTE' ? (ass.dta_fim_teste ?? new Date()) : (ass.dtavencimento ?? new Date()),
      },
    });
    return { ...(await this.obter(u.idIgreja)), mensagem: 'Assinatura cancelada. O acesso continua até o fim do período já pago.' };
  }

  // ------------------------------------------------------------------ webhooks do Mercado Pago
  async processarWebhook(tipo: string, id: string) {
    if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
      return this.aplicarPreapproval(await this.mp.obterAssinatura(id));
    }
    if (tipo === 'subscription_authorized_payment' || tipo === 'authorized_payment') {
      return this.registrarPagamentoRecorrente(await this.mp.obterPagamentoRecorrente(id));
    }
    this.logger.log(`Webhook "${tipo}" (${id}) ignorado — não faz parte do fluxo de assinatura.`);
  }

  /** Sincroniza o estado local com o objeto "preapproval" do Mercado Pago (idempotente). */
  async aplicarPreapproval(p: MpPreapproval) {
    const ref = lerRef(p.external_reference);
    let ass = await this.prisma.assinatura.findFirst({ where: { mp_preapproval_id: p.id } });
    if (!ass && ref.idIgreja) ass = await this.prisma.assinatura.findUnique({ where: { id_igreja: ref.idIgreja } });
    if (!ass || (ref.idIgreja && ref.idIgreja !== ass.id_igreja)) {
      this.logger.warn(`Preapproval ${p.id} não corresponde a nenhuma assinatura (ref=${p.external_reference}).`);
      return;
    }

    const outroVigente = ass.mp_preapproval_id && ass.mp_preapproval_id !== p.id;
    if (outroVigente) {
      // já existe outra assinatura MP desta igreja
      if (p.status === 'authorized' && ass.mp_status === 'authorized' && ['ATIVA', 'ATRASADA'].includes(ass.status)) {
        this.logger.warn(`Assinatura duplicada ${p.id}: cancelando para evitar cobrança em dobro.`);
        await this.mp.cancelar(p.id);
        return;
      }
      if (p.status !== 'authorized') return; // evento de um checkout antigo/abandonado
    }

    const dados: Record<string, unknown> = {
      mp_preapproval_id: p.id,
      mp_status: p.status,
      email_pagador: p.payer_email ?? ass.email_pagador,
    };
    const valorMp = p.auto_recurring?.transaction_amount;
    if (valorMp) dados.valor_cobrado = valorMp;

    if (p.status === 'authorized') {
      const proxima = dataOuNulo(p.next_payment_date);
      const venc = proxima && (!ass.dtavencimento || proxima > ass.dtavencimento) ? proxima : (ass.dtavencimento ?? addMeses(new Date(), 1));
      Object.assign(dados, { status: 'ATIVA', dtavencimento: venc, dta_cancelamento: null });
      // plano escolhido no checkout vira o plano atual
      if (ref.plano && ref.plano !== ass.id_plano && ass.status !== 'ATIVA') {
        const pl = await this.prisma.plano.findUnique({ where: { id_plano: ref.plano } });
        if (pl) dados.id_plano = pl.id_plano;
      }
      if (ref.cupom) await this.aplicarCupom(ass.id_assinatura, ref.cupom);
    } else if (p.status === 'paused') {
      if (['ATIVA', 'ATRASADA'].includes(ass.status)) dados.status = 'ATRASADA';
    } else if (p.status === 'cancelled') {
      if (!['CANCELADA', 'EXPIRADA'].includes(ass.status)) {
        Object.assign(dados, { status: 'CANCELADA', dta_cancelamento: new Date(), dtavencimento: ass.dtavencimento ?? new Date(), id_plano_pendente: null });
      }
    }
    await this.prisma.assinatura.update({ where: { id_assinatura: ass.id_assinatura }, data: dados });
  }

  private async aplicarCupom(idAssinatura: number, codigo: string) {
    const promo = await this.prisma.promocao.findUnique({ where: { codigo } });
    if (!promo) return;
    const ja = await this.prisma.desconto.findUnique({
      where: { id_assinatura_id_promocao: { id_assinatura: idAssinatura, id_promocao: promo.id_promocao } },
    });
    if (ja) return;
    await this.prisma.$transaction([
      this.prisma.desconto.create({ data: { id_assinatura: idAssinatura, id_promocao: promo.id_promocao, perc_aplicado: promo.perc_desconto } }),
      this.prisma.promocao.update({ where: { id_promocao: promo.id_promocao }, data: { total_usos: { increment: 1 } } }),
      this.prisma.assinatura.update({ where: { id_assinatura: idAssinatura }, data: { indpossuidesconto: true } }),
    ]);
  }

  /** Cada cobrança recorrente vira uma Fatura; aprovada => renova o período, recusada => carência. */
  async registrarPagamentoRecorrente(ap: MpPagamentoRecorrente) {
    const ass = await this.prisma.assinatura.findFirst({
      where: { mp_preapproval_id: String(ap.preapproval_id) },
      include: { Plano: true, Igreja: { include: { usuarios: { where: { perfil: 'ADMINISTRADOR', ativo: true } } } } },
    });
    if (!ass) {
      this.logger.warn(`Cobrança ${ap.id} de assinatura desconhecida (${ap.preapproval_id}).`);
      return;
    }
    const pagStatus = ap.payment?.status;
    const aprovado = ap.status === 'processed' && pagStatus === 'approved';
    const recusado = ['recycling', 'cancelled'].includes(ap.status) || ['rejected', 'cancelled'].includes(pagStatus ?? '');
    if (!aprovado && !recusado) return; // agendada/pendente: nada a registrar ainda

    const venc = dataOuNulo(ap.debit_date) ?? new Date();
    const statusFatura: StatusFatura = aprovado ? 'PAGA' : 'RECUSADA';
    const valorPago = Number(ap.transaction_amount ?? ass.valor_cobrado ?? ass.Plano.valor);
    const dadosFatura = {
      id_assinatura: ass.id_assinatura,
      id_plano: ass.id_plano,
      mes: venc.getUTCMonth() + 1,
      ano: venc.getUTCFullYear(),
      dta_vencimento: venc,
      dtahor_pagamento: aprovado ? (dataOuNulo(ap.last_modified) ?? new Date()) : null,
      vlrtotal: Number(ass.Plano.valor),
      vlrapagar: valorPago,
      status: statusFatura,
      motivo_recusa: aprovado ? null : (ap.payment?.status_detail ?? ap.rejection_code ?? 'Cobrança recusada'),
      mp_payment_id: ap.payment?.id ? String(ap.payment.id) : null,
    };
    const anterior = await this.prisma.fatura.findUnique({ where: { mp_authorized_payment_id: String(ap.id) } });
    await this.prisma.fatura.upsert({
      where: { mp_authorized_payment_id: String(ap.id) },
      create: { ...dadosFatura, mp_authorized_payment_id: String(ap.id) },
      update: dadosFatura,
    });

    if (aprovado) {
      let proximo = addMeses(venc, 1);
      try {
        const mpAss = await this.mp.obterAssinatura(String(ap.preapproval_id));
        if (mpAss.next_payment_date) proximo = new Date(mpAss.next_payment_date);
      } catch {
        /* mantém o cálculo local */
      }
      if (ass.status === 'CANCELADA' || ass.status === 'EXPIRADA') return; // cancelou: não reativa por pagamento tardio
      await this.prisma.assinatura.update({
        where: { id_assinatura: ass.id_assinatura },
        data: { status: 'ATIVA', dtaultpagamento: new Date(), dtavencimento: proximo },
      });
      if (ass.id_plano_pendente) await this.aplicarPlanoPendente(ass.id_assinatura);
    } else if (!['CANCELADA', 'EXPIRADA'].includes(ass.status)) {
      await this.prisma.assinatura.update({ where: { id_assinatura: ass.id_assinatura }, data: { status: 'ATRASADA' } });
      if (anterior?.status !== 'RECUSADA') {
        await this.avisarAdmins(
          ass.Igreja.usuarios.map((a) => a.email),
          'Não conseguimos cobrar sua assinatura do Conectus',
          `A cobrança de R$ ${valorPago.toFixed(2)} foi recusada (${dadosFatura.motivo_recusa}). O Mercado Pago tentará novamente. Você tem ${env.carenciaDias} dias de carência antes do bloqueio; atualize a forma de pagamento para evitar a interrupção.`,
        );
      }
    }
  }

  /** Aplica o downgrade agendado — se o uso atual não couber, mantém o plano e restaura o valor cobrado. */
  private async aplicarPlanoPendente(idAssinatura: number) {
    const ass = await this.prisma.assinatura.findUnique({
      where: { id_assinatura: idAssinatura },
      include: { Plano: true, PlanoPendente: true, Igreja: { include: { usuarios: { where: { perfil: 'ADMINISTRADOR', ativo: true } } } } },
    });
    if (!ass?.PlanoPendente) return;
    const uso = await this.planos.usoDaIgreja(ass.id_igreja);
    const excede = this.planos.excedidos(uso, limitesDoPlano(ass.PlanoPendente));
    if (!excede.length) {
      await this.prisma.assinatura.update({ where: { id_assinatura: idAssinatura }, data: { id_plano: ass.id_plano_pendente, id_plano_pendente: null } });
      return;
    }
    // não cabe: mantém o plano atual e devolve o valor cheio no MP
    const desc = await this.prisma.desconto.findFirst({ where: { id_assinatura: idAssinatura } });
    const valor = r2(Number(ass.Plano.valor) * (1 - (desc?.perc_aplicado ?? 0) / 100));
    if (ass.mp_preapproval_id && this.mp.configurado) await this.mp.atualizarValor(ass.mp_preapproval_id, valor).catch(() => null);
    await this.prisma.assinatura.update({ where: { id_assinatura: idAssinatura }, data: { id_plano_pendente: null, valor_cobrado: valor } });
    await this.avisarAdmins(
      ass.Igreja.usuarios.map((a) => a.email),
      'Downgrade de plano não aplicado',
      `O uso atual da igreja (${excede.map((k) => `${uso[k]} ${k}`).join(', ')}) excede o plano ${ass.PlanoPendente.nome}; mantivemos o plano ${ass.Plano.nome}.`,
    );
  }

  private async avisarAdmins(emails: string[], assunto: string, corpo: string) {
    await Promise.all(emails.map((e) => this.mail.aviso(e, assunto, corpo)));
  }

  // ------------------------------------------------------------------ rotinas agendadas
  /** A cada hora: leva ao banco as transições que o tempo provoca (o guard já bloqueia sem depender disto). */
  @Cron('0 * * * *')
  async rodarCiclo() {
    const agora = new Date();
    const lista = await this.prisma.assinatura.findMany({
      where: { status: { not: 'EXPIRADA' } },
      include: { Igreja: { include: { usuarios: { where: { perfil: 'ADMINISTRADOR', ativo: true } } } } },
    });
    let alteradas = 0;
    for (const a of lista) {
      try {
        const sit = avaliarAcesso(a, agora);
        if (sit.status !== a.status) {
          await this.prisma.assinatura.update({ where: { id_assinatura: a.id_assinatura }, data: { status: sit.status } });
          alteradas += 1;
          const emails = a.Igreja.usuarios.map((x) => x.email);
          if (sit.status === 'EXPIRADA') {
            await this.avisarAdmins(emails, 'Seu acesso ao Conectus foi bloqueado',
              `${{ TESTE_ENCERRADO: 'O período de teste terminou', PAGAMENTO_ATRASADO: 'O pagamento não foi identificado dentro da carência', ASSINATURA_CANCELADA: 'O período pago da assinatura cancelada terminou', ASSINATURA_EXPIRADA: 'A assinatura expirou' }[sit.motivoBloqueio ?? 'ASSINATURA_EXPIRADA']}. O sistema ficou em modo somente leitura; seus dados estão preservados. Assine para voltar a usar.`);
          }
        }
        if (a.id_plano_pendente && a.dtavencimento && a.dtavencimento <= agora && sit.liberado) {
          await this.aplicarPlanoPendente(a.id_assinatura);
        }
      } catch (e) {
        this.logger.error(`Ciclo da assinatura ${a.id_assinatura}: ${(e as Error).message}`);
      }
    }
    return { verificadas: lista.length, alteradas };
  }

  /** Todo dia às 09:00 (Brasília): lembretes de fim de teste e de pagamento em atraso. */
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async enviarLembretes() {
    const agora = new Date();
    const lista = await this.prisma.assinatura.findMany({
      where: { status: { in: ['TESTE', 'ATRASADA'] } },
      include: { Igreja: { include: { usuarios: { where: { perfil: 'ADMINISTRADOR', ativo: true } } } } },
    });
    for (const a of lista) {
      const emails = a.Igreja.usuarios.map((x) => x.email);
      if (a.status === 'TESTE' && a.dta_fim_teste) {
        const dias = Math.ceil((a.dta_fim_teste.getTime() - agora.getTime()) / 86400000);
        if (dias === 2 || dias === 1) {
          await this.avisarAdmins(emails, `Seu teste do Conectus termina em ${dias} dia(s)`, 'Assine um plano para continuar usando o sistema sem interrupção.');
        }
      } else if (a.status === 'ATRASADA') {
        await this.avisarAdmins(emails, 'Pagamento do Conectus pendente', 'Há uma cobrança pendente. Regularize para evitar o bloqueio do sistema.');
      }
    }
  }
}
