import { Injectable } from '@nestjs/common';
import { Celula, Disponibilidade_Membro, Membro } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { INCLUDE_CELULA } from '../common/mappers';
import { calcularMatching, CelulaMatch, MembroMatch, SCORE_MINIMO } from './matching';

export const paraMembroMatch = (m: Membro & { disponibilidades?: Disponibilidade_Membro[] }): MembroMatch => ({
  dataNascimento: m.data_nascimento,
  genero: m.genero,
  estadoCivil: m.estado_civil,
  perfilInteresse: m.perfil_interesse,
  latitude: m.latitude_membro,
  longitude: m.longitude_membro,
  disponibilidades: (m.disponibilidades ?? []).map((d) => ({
    diaSemana: d.dia_semana,
    horarioInicio: d.hora_inicio,
    horarioFim: d.hora_fim,
  })),
});

export const paraCelulaMatch = (c: Celula): CelulaMatch => ({
  idCelula: c.id_celula,
  ativa: c.ativa,
  capacidadeMaxima: c.capacidade_maxima,
  capacidadeAtual: c.capacidade_atual,
  perfilGrupo: c.perfil_grupo,
  faixaEtaria: `${c.faixa_etaria_min}-${c.faixa_etaria_max}`,
  diaSemana: c.dia_semana,
  horario: c.hora_celula,
  latitude: c.latitude,
  longitude: c.longitude,
});

/** Carrega as células do tenant e executa o algoritmo puro (matching.ts). */
@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  celulasAtivas(idIgreja: number) {
    return this.prisma.celula.findMany({ where: { id_igreja: idIgreja, ativa: true }, include: INCLUDE_CELULA });
  }

  sugerir(
    membro: Membro & { disponibilidades?: Disponibilidade_Membro[] },
    celulas: Celula[],
    limite = 3,
  ) {
    const porId = new Map(celulas.map((c) => [c.id_celula, c]));
    return calcularMatching(paraMembroMatch(membro), celulas.map(paraCelulaMatch), { limite }).map((r) => ({
      ...r,
      compativel: r.score >= SCORE_MINIMO,
      celula: porId.get(r.idCelula)!,
    }));
  }
}
