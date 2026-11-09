import { Injectable } from '@nestjs/common';
import { PrismaService } from '../global/prisma.service';
import { MembrosService } from '../membros/membros.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_MEMBRO, mapCelula, mapLog, mapMembro, resumoCelula } from '../common/mappers';
import { UsuarioAutenticado } from '../common/types';
import { calcularMatching, SCORE_MINIMO } from './matching';
import { MatchingService, paraCelulaMatch, paraMembroMatch } from './matching.service';
import { AlocacaoDto, RejeicaoDto } from './triagem.dto';

const ABERTOS = ['AGUARDANDO_TRIAGEM', 'LISTA_ESPERA'] as const;

@Injectable()
export class TriagemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membros: MembrosService,
    private readonly matching: MatchingService,
  ) {}

  /** Fila de triagem: mais antigos primeiro, cada um com a melhor célula sugerida. */
  async pendentes(u: UsuarioAutenticado) {
    const [lista, celulas] = await Promise.all([
      this.prisma.membro.findMany({
        where: { id_igreja: u.idIgreja, status_membro: 'AGUARDANDO_TRIAGEM' },
        include: INCLUDE_MEMBRO,
        orderBy: { dtahora_cadastro: 'asc' },
      }),
      this.matching.celulasAtivas(u.idIgreja),
    ]);
    return lista.map((m) => {
      const [melhor] = this.matching.sugerir(m, celulas, 1);
      return {
        ...mapMembro(m),
        melhorSugestao: melhor
          ? { ...resumoCelula(melhor.celula), score: melhor.score, compativel: melhor.compativel }
          : null,
      };
    });
  }

  /** UC003a — executa o matching e grava um log SUGERIDA por célula sugerida (RF01, RC04 < 3 s). */
  async executarMatching(u: UsuarioAutenticado, idMembro: number) {
    const inicio = Date.now();
    const m = await this.membros.doTenant(u, idMembro);
    if (!ABERTOS.includes(m.status_membro as any)) falhar(409, 'Este membro já foi triado.', { codigo: 'JA_TRIADO' });

    const celulas = await this.matching.celulasAtivas(u.idIgreja);
    const resultado = this.matching.sugerir(m, celulas, 3);

    const sugestoes = await this.prisma.$transaction(async (tx) => {
      await tx.log_Triagem.updateMany({
        where: { id_membro: idMembro, status_triagem: 'SUGERIDA' },
        data: { status_triagem: 'REJEITADA', motivo_rejeicao: 'Nova execução do matching', id_resp_decisao: u.idUsuario },
      });
      const saida = [];
      for (const r of resultado) {
        const log = await tx.log_Triagem.create({
          data: {
            id_membro: idMembro,
            id_celula_sugerida: r.idCelula,
            id_voluntario: u.idUsuario,
            score_matching: r.score,
            criterios_score: r.criterios as any,
            status_triagem: 'SUGERIDA',
          },
        });
        saida.push({
          idLog: log.id_log,
          score: r.score,
          compativel: r.compativel,
          criterios: r.criterios,
          celula: mapCelula(r.celula),
        });
      }
      return saida;
    });

    return { membro: mapMembro(m), sugestoes, scoreMinimo: SCORE_MINIMO, tempoMs: Date.now() - inicio };
  }

  /**
   * UC003 — confirma a alocação. Tudo em UMA transação e à prova de concorrência:
   *  - o membro só é "reivindicado" se ainda estiver aberto (dois voluntários não alocam o mesmo membro);
   *  - a vaga só é consumida se a célula estiver ativa e com capacidade (UPDATE condicional — RC06).
   */
  async alocar(u: UsuarioAutenticado, idMembro: number, dto: AlocacaoDto) {
    const m = await this.membros.doTenant(u, idMembro);
    if (!ABERTOS.includes(m.status_membro as any)) {
      falhar(409, `${m.nome_completo} já foi alocado(a) por outro voluntário.`, { codigo: 'JA_TRIADO' });
    }
    const cel = await this.prisma.celula.findFirst({ where: { id_celula: dto.idCelula, id_igreja: u.idIgreja } });
    if (!cel) falhar(404, 'Célula não encontrada.');
    if (!cel.ativa) falhar(409, 'Esta célula está inativa.', { codigo: 'CELULA_INATIVA' });
    if (cel.capacidade_atual >= cel.capacidade_maxima) {
      falhar(409, `A célula "${cel.nome_celula}" atingiu a capacidade máxima. Escolha outra célula.`, { codigo: 'CELULA_LOTADA' });
    }
    const modo = dto.modo ?? 'MANUAL';
    // escore da célula escolhida, calculado ANTES de consumir a vaga (para o log da triagem manual)
    const calc = calcularMatching(paraMembroMatch(m), [paraCelulaMatch(cel)], { limite: 1 })[0];

    const idLog = await this.prisma.$transaction(async (tx) => {
      const reivindicado = await tx.membro.updateMany({
        where: { id_membro: idMembro, id_igreja: u.idIgreja, status_membro: { in: [...ABERTOS] } },
        data: { status_membro: 'ALOCADO' },
      });
      if (reivindicado.count === 0) {
        falhar(409, `${m.nome_completo} já foi alocado(a) por outro voluntário.`, { codigo: 'JA_TRIADO' });
      }

      const vaga = await tx.$executeRaw`
        UPDATE tb_celula SET capacidade_atual = capacidade_atual + 1, dtahora_atualizado = (NOW() AT TIME ZONE 'UTC')
        WHERE id_celula = ${dto.idCelula} AND id_igreja = ${u.idIgreja}
          AND ativa = true AND capacidade_atual < capacidade_maxima`;
      if (vaga === 0) {
        falhar(409, `A célula "${cel.nome_celula}" atingiu a capacidade máxima. Escolha outra célula.`, { codigo: 'CELULA_LOTADA' });
      }

      let log = dto.idLog
        ? await tx.log_Triagem.findFirst({ where: { id_log: dto.idLog, id_membro: idMembro, id_celula_sugerida: dto.idCelula } })
        : null;
      if (log) {
        log = await tx.log_Triagem.update({
          where: { id_log: log.id_log },
          data: { status_triagem: 'APROVADA', id_resp_decisao: u.idUsuario },
        });
      } else {
        log = await tx.log_Triagem.create({
          data: {
            id_membro: idMembro,
            id_celula_sugerida: dto.idCelula,
            id_voluntario: u.idUsuario,
            score_matching: calc?.score ?? null,
            criterios_score: { ...(calc?.criterios ?? {}), modo } as any,
            status_triagem: 'APROVADA',
            id_resp_decisao: u.idUsuario,
          },
        });
      }
      await tx.log_Triagem.updateMany({
        where: { id_membro: idMembro, status_triagem: 'SUGERIDA' },
        data: { status_triagem: 'REJEITADA', motivo_rejeicao: 'Outra célula foi escolhida', id_resp_decisao: u.idUsuario },
      });
      await tx.lista_Espera.updateMany({
        where: { id_membro: idMembro, status: 'AGUARDANDO' },
        data: { status: 'RESOLVIDO', dtaresolucao: new Date() },
      });
      await tx.historico_Celulas.create({
        data: { id_membro: idMembro, id_celula: dto.idCelula, dta_entrada: new Date() },
      });
      await tx.membro.update({
        where: { id_membro: idMembro },
        data: { id_celula_alocada: dto.idCelula, id_usuario_triagem: u.idUsuario },
      });
      return log.id_log;
    });

    const [membro, celula] = await Promise.all([
      this.prisma.membro.findUnique({ where: { id_membro: idMembro }, include: INCLUDE_MEMBRO }),
      this.prisma.celula.findUnique({ where: { id_celula: dto.idCelula }, include: { lider: true } }),
    ]);
    return { membro: mapMembro(membro), celula: mapCelula(celula), idLog, modo };
  }

  async rejeitar(u: UsuarioAutenticado, idMembro: number, dto: RejeicaoDto) {
    await this.membros.doTenant(u, idMembro);
    const log = await this.prisma.log_Triagem.findFirst({ where: { id_log: dto.idLog, id_membro: idMembro } });
    if (!log) falhar(404, 'Sugestão não encontrada.');
    const r = await this.prisma.log_Triagem.update({
      where: { id_log: log.id_log },
      data: { status_triagem: 'REJEITADA', motivo_rejeicao: dto.motivo || 'Sem motivo informado', id_resp_decisao: u.idUsuario },
    });
    return mapLog(r);
  }

  async logs(u: UsuarioAutenticado, idMembro: number) {
    await this.membros.doTenant(u, idMembro);
    const logs = await this.prisma.log_Triagem.findMany({
      where: { id_membro: idMembro },
      include: { Celula: true },
      orderBy: { dtahora_triagem: 'desc' },
    });
    return logs.map(mapLog);
  }
}
