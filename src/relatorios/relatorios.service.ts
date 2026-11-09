import { Injectable } from '@nestjs/common';
import { PrismaService } from '../global/prisma.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_CELULA, INCLUDE_MEMBRO, mapCelula, mapMembro } from '../common/mappers';
import { addMeses } from '../common/util';
import { haversine } from '../triagem/matching';
import { UsuarioAutenticado } from '../common/types';

const FUSO_MS = 3 * 3600_000; // Brasília = UTC-3
/** "relógio" de Brasília representado em campos UTC (para agrupar por dia/mês locais) */
const local = (d: Date) => new Date(d.getTime() - FUSO_MS);
const mesDe = (d: Date) => local(d).toISOString().slice(0, 7);
const diaDe = (d: Date) => local(d).toISOString().slice(0, 10);

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Plano limita quantos meses de histórico aparecem nos relatórios (Essencial 6, Intermediário 12, Premium sem limite). */
  private async historicoDesde(idIgreja: number): Promise<Date | null> {
    const ass = await this.prisma.assinatura.findUnique({ where: { id_igreja: idIgreja }, include: { Plano: true } });
    const meses = ass?.Plano.historico_meses;
    return meses ? addMeses(new Date(), -meses) : null;
  }

  private periodo(de?: string, ate?: string, minimo: Date | null = null) {
    let inicio = de ? new Date(`${de}T00:00:00.000-03:00`) : null;
    if (minimo && (!inicio || inicio < minimo)) inicio = minimo;
    const fim = ate ? new Date(`${ate}T23:59:59.999-03:00`) : null;
    return { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) };
  }

  // ---------------------------------------------------------------- dashboard (todos os perfis)
  async resumo(u: UsuarioAutenticado) {
    const agora = new Date();
    const loc = local(agora);
    const inicioMes = new Date(Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), 1) + FUSO_MS);
    const semanaAtras = new Date(agora.getTime() - 7 * 86400000);
    const hoje = diaDe(agora);
    const seisMeses = new Date(Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth() - 5, 1) + FUSO_MS);

    const [membros, celulas, lideres, aprovados, notas, recentes] = await Promise.all([
      this.prisma.membro.findMany({
        where: { id_igreja: u.idIgreja },
        select: { id_membro: true, status_membro: true, dtahora_cadastro: true, nome_completo: true },
      }),
      this.prisma.celula.findMany({ where: { id_igreja: u.idIgreja, ativa: true }, include: INCLUDE_CELULA }),
      this.prisma.usuario.count({ where: { id_igreja: u.idIgreja, perfil: 'LIDER', ativo: true } }),
      this.prisma.log_Triagem.findMany({
        where: { status_triagem: 'APROVADA', Membro: { id_igreja: u.idIgreja } },
        include: { Membro: true, Celula: true },
        orderBy: { dtahora_triagem: 'desc' },
      }),
      this.prisma.feedback.findMany({ where: { Membro: { id_igreja: u.idIgreja }, nota_integracao: { not: null } }, select: { nota_integracao: true } }),
      this.prisma.membro.findMany({ where: { id_igreja: u.idIgreja }, orderBy: { dtahora_cadastro: 'desc' }, take: 6 }),
    ]);

    const capTotal = celulas.reduce((s, c) => s + c.capacidade_maxima, 0);
    const ocupTotal = celulas.reduce((s, c) => s + c.capacidade_atual, 0);
    const cadastradosMes = membros.filter((m) => m.dtahora_cadastro >= inicioMes);
    const aprovadosMes = new Set(aprovados.filter((l) => l.dtahora_triagem >= inicioMes).map((l) => l.id_membro));

    const atividade = [
      ...aprovados.slice(0, 6).map((l) => ({
        tipo: 'TRIAGEM',
        data: l.dtahora_triagem.toISOString(),
        texto: `${l.Membro.nome_completo} conectado(a) a ${l.Celula.nome_celula}`,
      })),
      ...recentes.map((m) => ({ tipo: 'CADASTRO', data: m.dtahora_cadastro.toISOString(), texto: `${m.nome_completo} cadastrado(a)` })),
    ]
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 6);

    const meses = Array.from({ length: 6 }, (_, i) => {
      const x = new Date(Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth() - (5 - i), 1));
      return x.toISOString().slice(0, 7);
    });
    const porMes = new Map<string, number>();
    membros.filter((m) => m.dtahora_cadastro >= seisMeses).forEach((m) => porMes.set(mesDe(m.dtahora_cadastro), (porMes.get(mesDe(m.dtahora_cadastro)) ?? 0) + 1));

    const valores = notas.map((n) => n.nota_integracao as number);
    return {
      kpis: {
        membrosAtivos: membros.filter((m) => m.status_membro === 'ALOCADO').length,
        novosSemana: membros.filter((m) => m.dtahora_cadastro >= semanaAtras).length,
        celulasAtivas: celulas.length,
        lideres,
        triagensHoje: aprovados.filter((l) => diaDe(l.dtahora_triagem) === hoje).length,
        pendentes: membros.filter((m) => m.status_membro === 'AGUARDANDO_TRIAGEM').length,
        listaEspera: membros.filter((m) => m.status_membro === 'LISTA_ESPERA').length,
        taxaOcupacao: capTotal ? Math.round((ocupTotal / capTotal) * 100) : 0,
        taxaConexao: cadastradosMes.length
          ? Math.min(100, Math.round((cadastradosMes.filter((m) => aprovadosMes.has(m.id_membro)).length / cadastradosMes.length) * 100))
          : 0,
        mediaIntegracao: valores.length ? Number((valores.reduce((s, n) => s + n, 0) / valores.length).toFixed(1)) : null,
      },
      novosPorMes: meses.map((mes) => ({ mes, total: porMes.get(mes) ?? 0 })),
      topCelulas: [...celulas].sort((a, b) => b.capacidade_atual - a.capacidade_atual).slice(0, 4).map(mapCelula),
      atividadeRecente: atividade,
    };
  }

  // ---------------------------------------------------------------- relatórios do administrador
  async novosMembros(u: UsuarioAutenticado, de?: string, ate?: string) {
    const minimo = await this.historicoDesde(u.idIgreja);
    const lista = await this.prisma.membro.findMany({
      where: { id_igreja: u.idIgreja, dtahora_cadastro: this.periodo(de, ate, minimo) },
      include: INCLUDE_MEMBRO,
      orderBy: { dtahora_cadastro: 'asc' },
    });
    const porMes = new Map<string, number>();
    lista.forEach((m) => porMes.set(mesDe(m.dtahora_cadastro), (porMes.get(mesDe(m.dtahora_cadastro)) ?? 0) + 1));
    return {
      total: lista.length,
      alocados: lista.filter((m) => m.status_membro === 'ALOCADO').length,
      porMes: [...porMes.entries()].map(([mes, total]) => ({ mes, total })),
      linhas: lista.map(mapMembro),
      historicoDesde: minimo ? minimo.toISOString().slice(0, 10) : null,
    };
  }

  async ocupacao(u: UsuarioAutenticado) {
    const celulas = await this.prisma.celula.findMany({ where: { id_igreja: u.idIgreja, ativa: true }, include: INCLUDE_CELULA });
    const linhas = celulas.map(mapCelula).sort((a, b) => b.ocupacaoPct - a.ocupacaoPct);
    const cap = linhas.reduce((s, c) => s + c.capacidadeMaxima, 0);
    const ocup = linhas.reduce((s, c) => s + c.capacidadeAtual, 0);
    return { linhas, totais: { capacidade: cap, ocupacao: ocup, vagas: cap - ocup, pct: cap ? Math.round((ocup / cap) * 100) : 0 } };
  }

  async distribuicaoGeografica(u: UsuarioAutenticado, de?: string, ate?: string) {
    const minimo = await this.historicoDesde(u.idIgreja);
    const [membros, celulas] = await Promise.all([
      this.prisma.membro.findMany({
        where: { id_igreja: u.idIgreja, status_membro: { not: 'DESLIGADO' }, dtahora_cadastro: this.periodo(de, ate, minimo) },
      }),
      this.prisma.celula.findMany({ where: { id_igreja: u.idIgreja, ativa: true } }),
    ]);
    const grupos = new Map<string, { bairro: string; cidade: string; total: number; alocados: number; latitude: number | null; longitude: number | null }>();
    for (const m of membros) {
      const k = `${m.bairro_membro}|${m.cidade}`;
      const g = grupos.get(k) ?? { bairro: m.bairro_membro, cidade: m.cidade, total: 0, alocados: 0, latitude: null, longitude: null };
      g.total += 1;
      if (m.status_membro === 'ALOCADO') g.alocados += 1;
      if (g.latitude === null && m.latitude_membro !== null) { g.latitude = m.latitude_membro; g.longitude = m.longitude_membro; }
      grupos.set(k, g);
    }
    const linhas = [...grupos.values()]
      .map((g) => {
        const kms = g.latitude === null ? [] : celulas.map((c) => haversine(g.latitude!, g.longitude!, c.latitude, c.longitude));
        return { ...g, celulaMaisProximaKm: kms.length ? Number(Math.min(...kms).toFixed(1)) : null };
      })
      .sort((a, b) => b.total - a.total);
    return { total: membros.length, linhas, historicoDesde: minimo ? minimo.toISOString().slice(0, 10) : null };
  }
}
