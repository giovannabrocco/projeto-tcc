import { falhar } from '../src/common/api-exception';
import { Injectable } from '@nestjs/common';

/** CEP -> coordenadas fixas (sem rede) */
const CEPS: Record<string, { bairro: string; cidade: string; lat: number; lng: number }> = {
  '04010100': { bairro: 'Vila Mariana', cidade: 'São Paulo', lat: -23.5893, lng: -46.6346 },
  '05422000': { bairro: 'Pinheiros', cidade: 'São Paulo', lat: -23.5662, lng: -46.6918 },
  '02010000': { bairro: 'Santana', cidade: 'São Paulo', lat: -23.5025, lng: -46.6251 },
};

@Injectable()
export class GeoFake {
  async buscarCep(cep: string) {
    const d = cep.replace(/\D/g, '');
    if (d === '00000000') {
      const { ApiException } = await import('../src/common/api-exception');
      throw new ApiException(400, 'CEP não encontrado.', { campos: { cep: 'CEP não encontrado.' } });
    }
    const c = CEPS[d] ?? CEPS['04010100'];
    return { cep: d, cidade: c.cidade, estado: 'SP', bairro: c.bairro, rua: 'Rua Teste', latitude: c.lat, longitude: c.lng };
  }
}

@Injectable()
export class MailFake {
  enviados: { para: string; assunto: string; texto: string }[] = [];
  async enviar(para: string, assunto: string, texto: string) { this.enviados.push({ para, assunto, texto }); return true; }
  boasVindas(para: string) { return this.enviar(para, 'boas-vindas', ''); }
  credenciais(para: string, nome: string, igreja: string, senha: string) { return this.enviar(para, 'credenciais', senha); }
  redefinirSenha(para: string, nome: string, link: string) { return this.enviar(para, 'redefinir', link); }
  aviso(para: string, assunto: string, corpo: string) { return this.enviar(para, assunto, corpo); }
}

/** Mercado Pago em memória: o teste "faz de conta" que o cliente pagou. */
@Injectable()
export class MpFake {
  configurado = true;
  assinaturas = new Map<string, any>();
  pagamentos = new Map<string, any>();
  seq = 0;
  chamadas: string[] = [];

  async criarAssinatura(p: { motivo: string; referencia: string; emailPagador: string; valor: number }) {
    const id = `pre_${++this.seq}`;
    const a = { id, status: 'pending', external_reference: p.referencia, payer_email: p.emailPagador, init_point: `https://mp.test/checkout/${id}`, next_payment_date: null, auto_recurring: { transaction_amount: p.valor } };
    this.assinaturas.set(id, a);
    this.chamadas.push(`criar:${id}:${p.valor}`);
    return a;
  }
  async obterAssinatura(id: string) { const a = this.assinaturas.get(id); if (!a) falhar(404, 'não encontrada', { codigo: 'MP_NAO_ENCONTRADO' }); return a; }
  async atualizarValor(id: string, valor: number) { this.assinaturas.get(id).auto_recurring.transaction_amount = valor; this.chamadas.push(`valor:${id}:${valor}`); return this.assinaturas.get(id); }
  async cancelar(id: string) { this.assinaturas.get(id).status = 'cancelled'; this.chamadas.push(`cancelar:${id}`); return this.assinaturas.get(id); }
  async obterPagamentoRecorrente(id: string) { const a = this.pagamentos.get(id); if (!a) falhar(404, 'não encontrada', { codigo: 'MP_NAO_ENCONTRADO' }); return a; }
  assinaturaWebhookValida() { return true; }

  // ---- ações do "cliente"
  autorizar(id: string, proximaCobranca: Date) {
    const a = this.assinaturas.get(id); a.status = 'authorized'; a.next_payment_date = proximaCobranca.toISOString();
  }
  cobranca(id: string, preapproval: string, resultado: 'aprovada' | 'recusada', debito = new Date()) {
    const ok = resultado === 'aprovada';
    this.pagamentos.set(id, {
      id, preapproval_id: preapproval, status: ok ? 'processed' : 'recycling',
      transaction_amount: this.assinaturas.get(preapproval).auto_recurring.transaction_amount,
      debit_date: debito.toISOString(), last_modified: debito.toISOString(),
      payment: { id: 9000 + Number(id.replace(/\D/g, '') || 0), status: ok ? 'approved' : 'rejected', status_detail: ok ? 'accredited' : 'cc_rejected_insufficient_amount' },
    });
  }
}
