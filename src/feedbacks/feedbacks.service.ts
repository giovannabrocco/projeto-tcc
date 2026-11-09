import { Injectable } from '@nestjs/common';
import { PrismaService } from '../global/prisma.service';
import { MembrosService } from '../membros/membros.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_CELULA, INCLUDE_MEMBRO, mapCelula, mapFeedback, mapMembro } from '../common/mappers';
import { isoData } from '../common/util';
import { UsuarioAutenticado } from '../common/types';
import { CriarFeedbackDto } from './feedbacks.dto';

@Injectable()
export class FeedbacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membros: MembrosService,
  ) {}

  /** UC007 — lista os integrantes da célula com o último feedback de cada um. */
  async acompanhamento(u: UsuarioAutenticado, idCelulaParam?: number) {
    let idCelula = idCelulaParam;
    if (u.perfil === 'LIDER') idCelula = (await this.membros.celulaDoLider(u.idUsuario))?.id_celula;
    if (!idCelula) return { celula: null, itens: [] };
    const cel = await this.prisma.celula.findFirst({ where: { id_celula: idCelula, id_igreja: u.idIgreja }, include: INCLUDE_CELULA });
    if (!cel) falhar(404, 'Célula não encontrada.');

    const membros = await this.prisma.membro.findMany({
      where: { id_celula_alocada: idCelula, id_igreja: u.idIgreja },
      include: {
        ...INCLUDE_MEMBRO,
        historico: { where: { id_celula: idCelula, dta_saida: null }, take: 1 },
        feedbacks: { orderBy: { dtahora_criado: 'desc' } },
        logs: { where: { status_triagem: 'APROVADA' }, orderBy: { dtahora_triagem: 'desc' }, take: 1 },
      },
    });
    const itens = membros
      .map((m) => ({
        membro: mapMembro(m),
        dataEntrada: isoData(m.historico[0]?.dta_entrada),
        idLogTriagem: m.logs[0]?.id_log ?? null,
        ultimoFeedback: m.feedbacks[0] ? mapFeedback(m.feedbacks[0]) : null,
        totalFeedbacks: m.feedbacks.length,
      }))
      .sort((a, b) => String(b.dataEntrada).localeCompare(String(a.dataEntrada)));
    return { celula: mapCelula(cel), itens };
  }

  async listar(u: UsuarioAutenticado, idMembro?: number) {
    const where: any = { Membro: { id_igreja: u.idIgreja } };
    if (u.perfil === 'LIDER') {
      const cel = await this.membros.celulaDoLider(u.idUsuario);
      if (!cel) return [];
      where.Membro.id_celula_alocada = cel.id_celula;
    }
    if (idMembro) where.id_membro = idMembro;
    const lista = await this.prisma.feedback.findMany({ where, orderBy: { dtahora_criado: 'desc' } });
    return lista.map(mapFeedback);
  }

  async criar(u: UsuarioAutenticado, dto: CriarFeedbackDto) {
    const m = await this.membros.doTenant(u, dto.idMembro, { exigirCelulaDoLider: false });
    const cel = await this.membros.celulaDoLider(u.idUsuario);
    if (!cel || m.id_celula_alocada !== cel.id_celula) falhar(403, 'O membro não pertence à sua célula.');
    const log = await this.prisma.log_Triagem.findFirst({
      where: { id_membro: m.id_membro, status_triagem: 'APROVADA' },
      orderBy: { dtahora_triagem: 'desc' },
    });
    const f = await this.prisma.feedback.create({
      data: {
        id_membro: m.id_membro,
        id_log_triagem: log?.id_log ?? null,
        status_adaptacao: dto.statusAdaptacao,
        nota_integracao: dto.notaIntegracao ?? null,
        permaneceu_na_celula: dto.permaneceuNaCelula ?? true,
        dta_visita: dto.dataVisita ? new Date(dto.dataVisita) : null,
        dta_proximo_contato: dto.dataProximoContato ? new Date(dto.dataProximoContato) : null,
        comentarios_membro: dto.comentariosMembro ?? '',
        avaliacao_lider: dto.avaliacaoLider ?? '',
      },
    });
    return mapFeedback(f);
  }
}
