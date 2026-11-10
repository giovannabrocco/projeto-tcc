import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { falhar } from '../common/api-exception';

export interface MpPreapproval {
  id: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled' | string;
  external_reference?: string;
  payer_email?: string;
  init_point?: string;
  next_payment_date?: string | null;
  auto_recurring?: { transaction_amount?: number; frequency?: number; frequency_type?: string };
  [k: string]: unknown;
}

export interface MpPagamentoRecorrente {
  id: number | string;
  preapproval_id: string;
  status: string; // scheduled | processed | recycling | cancelled
  transaction_amount?: number;
  debit_date?: string;
  last_modified?: string;
  rejection_code?: string;
  payment?: { id?: number | string; status?: string; status_detail?: string };
  [k: string]: unknown;
}

/**
 * Cliente da API de Assinaturas (preapproval) do Mercado Pago.
 * Fluxo: criamos a assinatura "pendente" -> devolvemos o init_point -> o cliente informa o cartão
 * no ambiente do Mercado Pago (o Conectus NUNCA toca em dados de cartão) -> o MP nos avisa por webhook.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger('MercadoPago');

  get configurado() {
    return !!env.mpAccessToken;
  }

  private http(): AxiosInstance {
    if (!this.configurado) {
      falhar(503, 'Pagamentos indisponíveis no momento (Mercado Pago não configurado).', { codigo: 'MP_NAO_CONFIGURADO' });
    }
    return axios.create({
      baseURL: env.mpApiUrl,
      timeout: 15000,
      headers: { Authorization: `Bearer ${env.mpAccessToken}`, 'Content-Type': 'application/json' },
    });
  }

  /** O MP respondeu 404: o recurso não existe (ex.: id de teste do painel). Não adianta o MP reenviar. */
  private naoEncontrado(e: any, o_que: string) {
    // 404 (não existe) ou 400 (id inválido, como o "123456" do painel): reenviar o webhook não resolve
    if ([400, 404].includes(e?.response?.status)) {
      this.logger.warn(`Mercado Pago não encontrou ${o_que} consultada.`);
      falhar(404, `O Mercado Pago não encontrou ${o_que}.`, { codigo: 'MP_NAO_ENCONTRADO' });
    }
  }

  private erro(e: any, acao: string): never {
    const detalhe = e?.response?.data ?? e?.message;
    this.logger.error(`Falha ao ${acao}: ${JSON.stringify(detalhe)}`);
    const msg = e?.response?.data?.message;
    return falhar(502, `Não foi possível ${acao} no Mercado Pago${msg ? ` (${msg})` : ''}. Tente novamente.`, {
      codigo: 'MP_ERRO',
    });
  }

  async criarAssinatura(p: {
    motivo: string; referencia: string; emailPagador: string; valor: number;
  }): Promise<MpPreapproval> {
    try {
      const { data } = await this.http().post<MpPreapproval>(
        '/preapproval',
        {
          reason: p.motivo,
          external_reference: p.referencia,
          payer_email: p.emailPagador,
          back_url: env.mpBackUrl,
          status: 'pending', // sem cartão: o cliente conclui no checkout do MP (init_point)
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: p.valor,
            currency_id: 'BRL',
          },
          ...(env.mpNotificationUrl ? { notification_url: env.mpNotificationUrl } : {}),
        },
        { headers: { 'X-Idempotency-Key': randomUUID() } },
      );
      return data;
    } catch (e) {
      return this.erro(e, 'criar a assinatura');
    }
  }

  async obterAssinatura(id: string): Promise<MpPreapproval> {
    try {
      return (await this.http().get<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`)).data;
    } catch (e) {
      this.naoEncontrado(e, 'a assinatura');
      return this.erro(e, 'consultar a assinatura');
    }
  }

  async atualizarValor(id: string, valor: number): Promise<MpPreapproval> {
    try {
      return (
        await this.http().put<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
          auto_recurring: { transaction_amount: valor, currency_id: 'BRL' },
        })
      ).data;
    } catch (e) {
      return this.erro(e, 'atualizar o valor da assinatura');
    }
  }

  async cancelar(id: string): Promise<MpPreapproval> {
    try {
      return (await this.http().put<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' })).data;
    } catch (e) {
      return this.erro(e, 'cancelar a assinatura');
    }
  }

  async obterPagamentoRecorrente(id: string): Promise<MpPagamentoRecorrente> {
    try {
      return (await this.http().get<MpPagamentoRecorrente>(`/authorized_payments/${encodeURIComponent(id)}`)).data;
    } catch (e) {
      this.naoEncontrado(e, 'a cobrança');
      return this.erro(e, 'consultar a cobrança');
    }
  }

  /**
   * Valida o cabeçalho x-signature do webhook (HMAC-SHA256 do manifesto
   * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"). Sem MP_WEBHOOK_SECRET retorna true:
   * mesmo assim o estado é SEMPRE relido da API do MP com o nosso token, então um webhook
   * forjado não consegue alterar nada por conta própria.
   */
  assinaturaWebhookValida(p: { xSignature?: string; xRequestId?: string; dataId?: string }): boolean {
    const segredo = env.mpWebhookSecret;
    if (!segredo) {
      this.logger.warn('MP_WEBHOOK_SECRET não definido: assinatura do webhook não verificada.');
      return true;
    }
    if (!p.xSignature) return false;
    const partes = Object.fromEntries(
      p.xSignature.split(',').map((kv) => {
        const i = kv.indexOf('=');
        return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
      }),
    );
    const { ts, v1 } = partes;
    if (!ts || !v1) return false;
    const id = p.dataId && /^[a-zA-Z0-9]+$/.test(p.dataId) ? p.dataId.toLowerCase() : p.dataId;
    const manifesto = `${id ? `id:${id};` : ''}${p.xRequestId ? `request-id:${p.xRequestId};` : ''}ts:${ts};`;
    const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
    } catch {
      return false;
    }
  }
}
