import { Controller, Get, Query } from '@nestjs/common';
import { UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { PrismaService } from '../global/prisma.service';
import { INCLUDE_CELULA, INCLUDE_MEMBRO, INCLUDE_USUARIO, mapCelula, mapMembro, mapUsuario, resumoCelula } from '../common/mappers';
import { normalizar } from '../common/util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BuscaService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF07 — busca global (mín. 2 caracteres, até 8 resultados de cada tipo). Líder só enxerga membros da própria célula. */
  async buscar(u: UsuarioAutenticado, termo = '') {
    const q = normalizar(termo);
    if (q.length < 2) return { membros: [], celulas: [], lideres: [] };

    const whereMembro: any = { id_igreja: u.idIgreja };
    if (u.perfil === 'LIDER') {
      const cel = await this.prisma.celula.findFirst({ where: { id_lider: u.idUsuario, ativa: true } });
      whereMembro.id_celula_alocada = cel ? cel.id_celula : -1;
    }
    const [membros, celulas, lideres] = await Promise.all([
      this.prisma.membro.findMany({ where: whereMembro, include: INCLUDE_MEMBRO }),
      this.prisma.celula.findMany({ where: { id_igreja: u.idIgreja, ativa: true }, include: INCLUDE_CELULA }),
      this.prisma.usuario.findMany({ where: { id_igreja: u.idIgreja, perfil: 'LIDER', ativo: true }, include: INCLUDE_USUARIO }),
    ]);
    return {
      membros: membros.filter((m) => normalizar(m.nome_completo).includes(q)).slice(0, 8).map(mapMembro),
      celulas: celulas.filter((c) => normalizar(`${c.nome_celula} ${c.bairro}`).includes(q)).slice(0, 8).map(mapCelula),
      lideres: lideres
        .filter((l) => normalizar(l.nome).includes(q))
        .slice(0, 8)
        .map((l) => {
          const cel = l.celulasLideradas.find((c) => c.ativa);
          return {
            ...mapUsuario(l),
            liderDesde: l.dtahora_criado.toISOString(),
            celula: cel ? { ...resumoCelula(cel), capacidadeAtual: cel.capacidade_atual, capacidadeMaxima: cel.capacidade_maxima } : null,
            totalMembros: cel?.capacidade_atual ?? 0,
          };
        }),
    };
  }
}

@Controller('busca')
export class BuscaController {
  constructor(private readonly busca: BuscaService) {}

  @Get()
  buscar(@UsuarioAtual() u: UsuarioAutenticado, @Query('q') q?: string) {
    return this.busca.buscar(u, q);
  }
}

