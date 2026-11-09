import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { PlanosService } from '../planos/planos.service';
import { GeoService } from '../geo/geo.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_CELULA, mapCelula } from '../common/mappers';
import { normalizar, somenteDigitos } from '../common/util';
import { UsuarioAutenticado } from '../common/types';
import { SalvarCelulaDto } from './celulas.dto';

const ORDEM = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const FUSO_BRASIL_H = 3; // America/Sao_Paulo = UTC-3 (sem horário de verão desde 2019)

/** Próxima reunião (ISO UTC) a partir de "dia da semana + HH:MM" no horário de Brasília. */
export function proximaReuniao(diaSemana: string, horario: string, agora = new Date()): string | null {
  const alvo = ORDEM.indexOf(diaSemana);
  const [h, m] = horario.split(':').map(Number);
  const local = new Date(agora.getTime() - FUSO_BRASIL_H * 3600_000); // "relógio" de Brasília em campos UTC
  for (let i = 0; i < 8; i++) {
    const c = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + i, h, m));
    if (c.getUTCDay() === alvo) {
      const real = new Date(c.getTime() + FUSO_BRASIL_H * 3600_000);
      if (real > agora) return real.toISOString();
    }
  }
  return null;
}

@Injectable()
export class CelulasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planos: PlanosService,
    private readonly geo: GeoService,
  ) {}

  async doTenant(idIgreja: number, id: number) {
    const c = await this.prisma.celula.findFirst({ where: { id_celula: id, id_igreja: idIgreja }, include: INCLUDE_CELULA });
    if (!c) falhar(404, 'Célula não encontrada.');
    return c;
  }

  async listar(u: UsuarioAutenticado, f: Record<string, string>) {
    const incluirInativas = f.incluirInativas === 'true' && u.perfil === 'ADMINISTRADOR';
    const where: Prisma.CelulaWhereInput = {
      id_igreja: u.idIgreja,
      ...(incluirInativas ? {} : { ativa: true }),
      ...(f.perfil ? { perfil_grupo: f.perfil } : {}),
      ...(f.dia ? { dia_semana: f.dia } : {}),
    };
    let lista = await this.prisma.celula.findMany({ where, include: INCLUDE_CELULA, orderBy: { nome_celula: 'asc' } });
    if (f.comVagas === 'true') lista = lista.filter((c) => c.capacidade_atual < c.capacidade_maxima);
    if (f.q) lista = lista.filter((c) => normalizar(`${c.nome_celula} ${c.bairro}`).includes(normalizar(f.q)));
    if (f.bairro) lista = lista.filter((c) => normalizar(c.bairro).includes(normalizar(f.bairro)));
    return lista.map(mapCelula);
  }

  async obter(idIgreja: number, id: number) {
    const c = await this.doTenant(idIgreja, id);
    const membros = await this.prisma.membro.findMany({
      where: { id_celula_alocada: c.id_celula, id_igreja: idIgreja },
      include: { historico: { where: { id_celula: c.id_celula, dta_saida: null }, take: 1 } },
    });
    const integrantes = membros
      .map((m) => ({
        idMembro: m.id_membro,
        nomeCompleto: m.nome_completo,
        dataEntrada: m.historico[0]?.dta_entrada.toISOString().slice(0, 10) ?? null,
      }))
      .sort((a, b) => String(b.dataEntrada).localeCompare(String(a.dataEntrada)));
    return { ...mapCelula(c), integrantes, proximaReuniao: c.ativa ? proximaReuniao(c.dia_semana, c.hora_celula) : null };
  }

  /** Líder precisa ser usuário ATIVO, perfil LIDER, da mesma igreja e sem outra célula ativa. */
  private async validarLider(idIgreja: number, idLider: number, idCelulaAtual?: number) {
    const lider = await this.prisma.usuario.findFirst({ where: { id_usuario: idLider, id_igreja: idIgreja } });
    if (!lider || lider.perfil !== 'LIDER' || !lider.ativo) {
      falhar(400, 'Selecione um usuário ativo com perfil Líder.', { campos: { idLider: 'Líder inválido.' } });
    }
    const outra = await this.prisma.celula.findFirst({
      where: { id_lider: idLider, ativa: true, ...(idCelulaAtual ? { id_celula: { not: idCelulaAtual } } : {}) },
    });
    if (outra) falhar(409, `${lider.nome} já lidera a célula "${outra.nome_celula}".`, { campos: { idLider: 'Líder já possui célula.' } });
  }

  private async coordenadas(dto: SalvarCelulaDto) {
    const end = await this.geo.buscarCep(dto.cep);
    const latitude = dto.latitude ?? end.latitude;
    const longitude = dto.longitude ?? end.longitude;
    if (latitude === null || longitude === null) {
      falhar(400, 'Não foi possível localizar este CEP no mapa. Informe latitude e longitude manualmente.', {
        campos: { cep: 'CEP sem coordenadas.' },
      });
    }
    return { latitude, longitude, cidade: dto.cidade?.trim() || end.cidade };
  }

  private dados(dto: SalvarCelulaDto) {
    const [min, max] = dto.faixaEtaria.split('-').map(Number);
    if (min > max) falhar(400, 'Faixa etária inválida.', { campos: { faixaEtaria: 'O mínimo deve ser menor que o máximo.' } });
    return {
      nome_celula: dto.nomeCelula.trim(),
      id_lider: dto.idLider,
      capacidade_maxima: dto.capacidadeMaxima,
      hora_celula: dto.horario,
      dia_semana: dto.diaSemana,
      perfil_grupo: dto.perfilGrupo,
      faixa_etaria_min: min,
      faixa_etaria_max: max,
      cep: somenteDigitos(dto.cep),
      bairro: dto.bairro.trim(),
      endereco: dto.endereco?.trim() ?? '',
      descricao: dto.descricao?.trim() ?? '',
    };
  }

  async criar(u: UsuarioAutenticado, dto: SalvarCelulaDto) {
    await this.planos.verificarLimite(u.idIgreja, 'celulas');
    await this.validarLider(u.idIgreja, dto.idLider);
    const dados = this.dados(dto);
    const geo = await this.coordenadas(dto);
    const c = await this.prisma.celula.create({
      data: { ...dados, id_igreja: u.idIgreja, latitude: geo.latitude, longitude: geo.longitude, cidade: geo.cidade },
      include: INCLUDE_CELULA,
    });
    return mapCelula(c);
  }

  async atualizar(u: UsuarioAutenticado, id: number, dto: SalvarCelulaDto) {
    const atual = await this.doTenant(u.idIgreja, id);
    await this.validarLider(u.idIgreja, dto.idLider, id);
    if (dto.capacidadeMaxima < atual.capacidade_atual) {
      falhar(400, `A célula já possui ${atual.capacidade_atual} membros; a capacidade não pode ser menor.`, {
        campos: { capacidadeMaxima: `Mínimo atual: ${atual.capacidade_atual}.` },
      });
    }
    const dados = this.dados(dto);
    // só geocodifica de novo se o CEP mudou (ou se vieram coordenadas manuais)
    let geo: { latitude: number; longitude: number; cidade: string } = {
      latitude: atual.latitude, longitude: atual.longitude, cidade: dto.cidade?.trim() || atual.cidade,
    };
    if (somenteDigitos(dto.cep) !== atual.cep || dto.latitude !== undefined || dto.longitude !== undefined) {
      geo = await this.coordenadas(dto);
    }
    const c = await this.prisma.celula.update({
      where: { id_celula: id },
      data: { ...dados, latitude: geo.latitude, longitude: geo.longitude, cidade: geo.cidade },
      include: INCLUDE_CELULA,
    });
    return mapCelula(c);
  }

  async alterarStatus(u: UsuarioAutenticado, id: number, ativa: boolean, confirmar = false) {
    const c = await this.doTenant(u.idIgreja, id);
    if (ativa) {
      if (!c.ativa) {
        await this.planos.verificarLimite(u.idIgreja, 'celulas');
        await this.validarLider(u.idIgreja, c.id_lider, id);
      }
      return mapCelula(await this.prisma.celula.update({ where: { id_celula: id }, data: { ativa: true }, include: INCLUDE_CELULA }));
    }

    const vinculados = await this.prisma.membro.findMany({ where: { id_celula_alocada: id, id_igreja: u.idIgreja } });
    if (vinculados.length && !confirmar) {
      falhar(409, `A célula possui ${vinculados.length} membro(s) ativo(s). Eles ficarão sem alocação até serem redistribuídos.`, {
        codigo: 'CONFIRMACAO_NECESSARIA',
      });
    }
    const hoje = new Date();
    const atualizada = await this.prisma.$transaction(async (tx) => {
      if (vinculados.length) {
        await tx.historico_Celulas.updateMany({
          where: { id_celula: id, dta_saida: null },
          data: { dta_saida: hoje, motivo_saida: 'Célula desativada' },
        });
        await tx.membro.updateMany({
          where: { id_celula_alocada: id },
          data: { id_celula_alocada: null, status_membro: 'AGUARDANDO_TRIAGEM' },
        });
      }
      return tx.celula.update({ where: { id_celula: id }, data: { ativa: false, capacidade_atual: 0 }, include: INCLUDE_CELULA });
    });
    return { ...mapCelula(atualizada), membrosRedistribuir: vinculados.length };
  }
}
