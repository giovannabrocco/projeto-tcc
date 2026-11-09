import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { PlanosService } from '../planos/planos.service';
import { GeoService } from '../geo/geo.service';
import { falhar } from '../common/api-exception';
import {
  INCLUDE_MEMBRO, mapFeedback, mapHistorico, mapLog, mapMembro,
} from '../common/mappers';
import { normalizar, somenteDigitos } from '../common/util';
import { UsuarioAutenticado } from '../common/types';
import { SalvarMembroDto } from './membros.dto';

@Injectable()
export class MembrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planos: PlanosService,
    private readonly geo: GeoService,
  ) {}

  /** Célula ativa que o usuário (perfil LIDER) lidera. */
  celulaDoLider(idUsuario: number) {
    return this.prisma.celula.findFirst({ where: { id_lider: idUsuario, ativa: true } });
  }

  /** Busca no tenant e, para LIDER, restringe aos membros da própria célula (403). */
  async doTenant(u: UsuarioAutenticado, id: number, opcoes: { exigirCelulaDoLider?: boolean } = {}) {
    const m = await this.prisma.membro.findFirst({ where: { id_membro: id, id_igreja: u.idIgreja }, include: INCLUDE_MEMBRO });
    if (!m) falhar(404, 'Membro não encontrado.');
    if (u.perfil === 'LIDER' && opcoes.exigirCelulaDoLider !== false) {
      const cel = await this.celulaDoLider(u.idUsuario);
      if (!cel || cel.id_celula !== m.id_celula_alocada) falhar(403, 'Este membro não pertence à sua célula.');
    }
    return m;
  }

  async listar(u: UsuarioAutenticado, f: Record<string, string>) {
    const where: Prisma.MembroWhereInput = { id_igreja: u.idIgreja };
    if (u.perfil === 'LIDER') {
      const cel = await this.celulaDoLider(u.idUsuario);
      if (!cel) return [];
      where.id_celula_alocada = cel.id_celula;
    }
    if (f.status) where.status_membro = f.status as any;
    if (f.idCelula) where.id_celula_alocada = Number(f.idCelula);
    if (f.de || f.ate) {
      where.dtahora_cadastro = {
        ...(f.de ? { gte: new Date(`${f.de}T00:00:00.000-03:00`) } : {}),
        ...(f.ate ? { lte: new Date(`${f.ate}T23:59:59.999-03:00`) } : {}),
      };
    }
    let lista = await this.prisma.membro.findMany({ where, include: INCLUDE_MEMBRO, orderBy: { dtahora_cadastro: 'desc' } });
    if (f.q) lista = lista.filter((m) => normalizar(m.nome_completo).includes(normalizar(f.q)));
    if (f.bairro) lista = lista.filter((m) => normalizar(m.bairro_membro).includes(normalizar(f.bairro)));
    return lista.map(mapMembro);
  }

  async obter(u: UsuarioAutenticado, id: number) {
    const base = await this.doTenant(u, id);
    const [historico, feedbacks, logs, indicador] = await Promise.all([
      this.prisma.historico_Celulas.findMany({ where: { id_membro: id }, include: { Celula: true }, orderBy: { dta_entrada: 'desc' } }),
      this.prisma.feedback.findMany({ where: { id_membro: id }, orderBy: { dtahora_criado: 'desc' } }),
      this.prisma.log_Triagem.findMany({ where: { id_membro: id }, include: { Celula: true }, orderBy: { dtahora_triagem: 'desc' } }),
      base.indicado_por ? this.prisma.membro.findUnique({ where: { id_membro: base.indicado_por } }) : null,
    ]);
    return {
      ...mapMembro(base),
      indicadoPorNome: indicador?.nome_completo ?? null,
      historico: historico.map(mapHistorico),
      feedbacks: feedbacks.map(mapFeedback),
      logs: logs.map(mapLog),
    };
  }

  // ---------------------------------------------------------------- cadastro
  private async prepararDados(u: UsuarioAutenticado, dto: SalvarMembroDto, existente?: { id_membro: number; cep: string }) {
    const nasc = new Date(dto.dataNascimento);
    const hoje = new Date();
    if (Number.isNaN(nasc.getTime()) || nasc > hoje || hoje.getUTCFullYear() - nasc.getUTCFullYear() > 120) {
      falhar(400, 'Data de nascimento inválida.', { campos: { dataNascimento: 'Data inválida.' } });
    }
    if (somenteDigitos(dto.telefone).length < 10) {
      falhar(400, 'Telefone inválido.', { campos: { telefone: 'Informe DDD + número.' } });
    }
    const email = dto.email?.trim().toLowerCase() || null;
    if (email) {
      const dup = await this.prisma.membro.findFirst({ where: { id_igreja: u.idIgreja, email } });
      if (dup && dup.id_membro !== existente?.id_membro) {
        falhar(409, 'Já existe um membro com este e-mail.', { campos: { email: 'E-mail já cadastrado.' } });
      }
    }
    if (dto.indicadoPor) {
      const ind = await this.prisma.membro.findFirst({ where: { id_membro: dto.indicadoPor, id_igreja: u.idIgreja } });
      if (!ind) falhar(400, 'Membro indicador não encontrado.', { campos: { indicadoPor: 'Indicador inválido.' } });
    }

    // geocodificação (necessária ao matching). Falha de CEP inexistente = 400; sem coordenadas = salva sem.
    let latitude = dto.latitude ?? null;
    let longitude = dto.longitude ?? null;
    let cidade = dto.cidade?.trim() ?? '';
    const cepMudou = !existente || somenteDigitos(dto.cep) !== existente.cep;
    if (cepMudou || !cidade || latitude === null) {
      const end = await this.geo.buscarCep(dto.cep);
      if (latitude === null) { latitude = end.latitude; longitude = end.longitude; }
      if (!cidade) cidade = end.cidade;
    }

    return {
      nome_completo: dto.nomeCompleto.trim(),
      data_nascimento: nasc,
      genero: dto.genero,
      estado_civil: dto.estadoCivil,
      telefone: dto.telefone.trim(),
      email,
      cep: somenteDigitos(dto.cep),
      bairro_membro: dto.bairro.trim(),
      cidade,
      latitude_membro: latitude,
      longitude_membro: longitude,
      perfil_interesse: dto.perfilInteresse ?? '',
      indicado_por: dto.indicadoPor ?? null,
      observacoes: dto.observacoes ?? '',
      ...(dto.consentimentoLgpd !== undefined ? { indlgpd: dto.consentimentoLgpd } : {}),
    };
  }

  private disponibilidades(dto: SalvarMembroDto) {
    return (dto.disponibilidades ?? []).map((d) => ({
      dia_semana: d.diaSemana,
      hora_inicio: d.horarioInicio ?? '',
      hora_fim: d.horarioFim ?? '',
    }));
  }

  async criar(u: UsuarioAutenticado, dto: SalvarMembroDto) {
    await this.planos.verificarLimite(u.idIgreja, 'membros');
    const dados = await this.prepararDados(u, dto);
    const m = await this.prisma.membro.create({
      data: {
        ...dados,
        id_igreja: u.idIgreja,
        id_usuario_triagem: u.idUsuario,
        status_membro: 'AGUARDANDO_TRIAGEM',
        disponibilidades: { create: this.disponibilidades(dto) },
      },
      include: INCLUDE_MEMBRO,
    });
    return mapMembro(m);
  }

  async atualizar(u: UsuarioAutenticado, id: number, dto: SalvarMembroDto) {
    const atual = await this.doTenant(u, id);
    const dados = await this.prepararDados(u, dto, { id_membro: id, cep: atual.cep });
    const m = await this.prisma.$transaction(async (tx) => {
      await tx.disponibilidade_Membro.deleteMany({ where: { id_membro: id } });
      return tx.membro.update({
        where: { id_membro: id },
        data: { ...dados, disponibilidades: { create: this.disponibilidades(dto) } },
        include: INCLUDE_MEMBRO,
      });
    });
    return mapMembro(m);
  }

  // ---------------------------------------------------------------- saída / desligamento
  async registrarSaida(u: UsuarioAutenticado, id: number, motivo: string | undefined, reencaminhar: boolean) {
    const m = await this.doTenant(u, id, { exigirCelulaDoLider: false });
    if (!m.id_celula_alocada) falhar(400, 'O membro não está alocado em uma célula.');
    if (u.perfil === 'LIDER') {
      const cel = await this.celulaDoLider(u.idUsuario);
      if (cel?.id_celula !== m.id_celula_alocada) falhar(403, 'Só é possível registrar saída de membros da sua célula.');
    }
    if (!motivo?.trim()) falhar(400, 'Informe o motivo da saída.', { campos: { motivo: 'Obrigatório.' } });

    const r = await this.prisma.$transaction(async (tx) => {
      await tx.historico_Celulas.updateMany({
        where: { id_membro: id, dta_saida: null },
        data: { dta_saida: new Date(), motivo_saida: motivo.trim() },
      });
      await tx.celula.updateMany({
        where: { id_celula: m.id_celula_alocada, capacidade_atual: { gt: 0 } },
        data: { capacidade_atual: { decrement: 1 } },
      });
      return tx.membro.update({
        where: { id_membro: id },
        data: { id_celula_alocada: null, status_membro: reencaminhar ? 'AGUARDANDO_TRIAGEM' : 'DESLIGADO' },
        include: INCLUDE_MEMBRO,
      });
    });
    return mapMembro(r);
  }

  /**
   * LGPD (art. 18): exclusão definitiva dos dados do membro. Histórico, logs, feedbacks e lista de
   * espera dele são removidos em cascata. Se estava em uma célula, a vaga é devolvida.
   */
  async excluir(u: UsuarioAutenticado, id: number) {
    const m = await this.doTenant(u, id);
    await this.prisma.$transaction(async (tx) => {
      if (m.id_celula_alocada) {
        await tx.celula.updateMany({
          where: { id_celula: m.id_celula_alocada, capacidade_atual: { gt: 0 } },
          data: { capacidade_atual: { decrement: 1 } },
        });
      }
      await tx.membro.delete({ where: { id_membro: id } });
    });
    return { mensagem: 'Dados do membro excluídos definitivamente.' };
  }
}
