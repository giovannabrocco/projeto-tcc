import { StatusAssinatura } from '../../generated/prisma/client';
import { env } from '../config/env';
import { addDias } from '../common/util';

export interface AssinaturaBase {
  status: StatusAssinatura;
  dta_fim_teste: Date | null;
  dtavencimento: Date | null;
}

export type MotivoBloqueio =
  | 'TESTE_ENCERRADO'
  | 'PAGAMENTO_ATRASADO'
  | 'ASSINATURA_CANCELADA'
  | 'ASSINATURA_EXPIRADA';

export interface Situacao {
  /** Status "real" levando em conta datas (o banco pode estar defasado até o cron rodar). */
  status: StatusAssinatura;
  /** true = uso normal; false = SOMENTE LEITURA (bloqueio). */
  liberado: boolean;
  motivoBloqueio: MotivoBloqueio | null;
  /** Até quando o acesso está garantido (fim do teste / período pago / carência). */
  acessoAte: Date | null;
}

/**
 * Regra única de acesso da assinatura. Usada pelo guard (a cada requisição), pelo cron e pelo
 * endpoint GET /assinatura — assim o bloqueio não depende de o cron ter rodado.
 *
 *  TESTE     -> liberado até dta_fim_teste
 *  ATIVA     -> liberado até dtavencimento; depois entra na CARÊNCIA (ATRASADA) por N dias
 *  ATRASADA  -> liberado até dtavencimento + carência
 *  CANCELADA -> liberado até dtavencimento (período já pago)
 *  EXPIRADA  -> bloqueado
 */
export function avaliarAcesso(a: AssinaturaBase, agora = new Date()): Situacao {
  const carencia = env.carenciaDias;
  switch (a.status) {
    case 'TESTE': {
      const fim = a.dta_fim_teste;
      if (fim && agora <= fim) return { status: 'TESTE', liberado: true, motivoBloqueio: null, acessoAte: fim };
      return { status: 'EXPIRADA', liberado: false, motivoBloqueio: 'TESTE_ENCERRADO', acessoAte: fim };
    }
    case 'ATIVA':
    case 'ATRASADA': {
      const venc = a.dtavencimento;
      if (!venc) return { status: a.status, liberado: true, motivoBloqueio: null, acessoAte: null };
      const limite = addDias(venc, carencia);
      if (agora <= venc && a.status === 'ATIVA')
        return { status: 'ATIVA', liberado: true, motivoBloqueio: null, acessoAte: venc };
      if (agora <= limite)
        return { status: 'ATRASADA', liberado: true, motivoBloqueio: null, acessoAte: limite };
      return { status: 'EXPIRADA', liberado: false, motivoBloqueio: 'PAGAMENTO_ATRASADO', acessoAte: limite };
    }
    case 'CANCELADA': {
      const venc = a.dtavencimento;
      if (venc && agora <= venc)
        return { status: 'CANCELADA', liberado: true, motivoBloqueio: null, acessoAte: venc };
      return { status: 'EXPIRADA', liberado: false, motivoBloqueio: 'ASSINATURA_CANCELADA', acessoAte: venc };
    }
    default:
      return { status: 'EXPIRADA', liberado: false, motivoBloqueio: 'ASSINATURA_EXPIRADA', acessoAte: null };
  }
}

/** Versão pronta para JSON (login, /auth/me, GET /assinatura). */
export function resumoAcesso(a: AssinaturaBase & { id_plano: string }, agora = new Date()) {
  const s = avaliarAcesso(a, agora);
  return {
    status: s.status,
    liberado: s.liberado,
    motivoBloqueio: s.motivoBloqueio,
    acessoAte: s.acessoAte ? s.acessoAte.toISOString() : null,
    diasRestantes: s.acessoAte ? Math.max(0, Math.ceil((s.acessoAte.getTime() - agora.getTime()) / 86400000)) : null,
    plano: a.id_plano,
  };
}
