import { Injectable } from '@nestjs/common';
import { Lista_Espera } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { MatchingService } from '../triagem/matching.service';
import { SCORE_MINIMO } from '../triagem/matching';
import { falhar } from '../common/api-exception';
import { INCLUDE_MEMBRO, mapMembro, resumoCelula } from '../common/mappers';
import { UsuarioAutenticado } from '../common/types';

@Injectable()
export class ListaEsperaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  private async montar(idIgreja: number, itens: (Lista_Espera & { Membro: any })[]) {
    const celulas = await this.matching.celulasAtivas(idIgreja);
    return itens.map((e) => {
      const [melhor] = this.matching.sugerir(e.Membro, celulas, 1);
      return {
        idEspera: e.id_espera,
        idMembro: e.id_membro,
        dataEntrada: e.data_entrada.toISOString(),
        motivo: e.motivo,
        status: e.status,
        dataResolucao: e.dtaresolucao?.toISOString() ?? null,
        tentativas: e.tentativas,
        membro: mapMembro(e.Membro),
        melhorSugestao: melhor ? { ...resumoCelula(melhor.celula), score: melhor.score, compativel: melhor.compativel } : null,
        // RF08: há célula compatível com vaga => o voluntário/administrador é avisado
        vagaDisponivel: !!melhor && melhor.score >= SCORE_MINIMO,
      };
    });
  }

  async listar(u: UsuarioAutenticado, status = 'AGUARDANDO') {
    if (!['AGUARDANDO', 'RESOLVIDO'].includes(status)) falhar(400, 'Status inválido.');
    const itens = await this.prisma.lista_Espera.findMany({
      where: { status: status as any, Membro: { id_igreja: u.idIgreja } },
      include: { Membro: { include: INCLUDE_MEMBRO } },
      orderBy: { data_entrada: 'asc' },
    });
    return this.montar(u.idIgreja, itens);
  }

  async adicionar(u: UsuarioAutenticado, idMembro: number, motivo?: string) {
    const m = await this.prisma.membro.findFirst({ where: { id_membro: idMembro, id_igreja: u.idIgreja } });
    if (!m) falhar(404, 'Membro não encontrado.');
    if (m.status_membro === 'ALOCADO') falhar(409, 'O membro já está alocado.');
    if (m.status_membro === 'DESLIGADO') falhar(409, 'O membro está desligado.');

    const id = await this.prisma.$transaction(async (tx) => {
      await tx.log_Triagem.updateMany({
        where: { id_membro: idMembro, status_triagem: 'SUGERIDA' },
        data: { status_triagem: 'REJEITADA', motivo_rejeicao: 'Enviado para lista de espera', id_resp_decisao: u.idUsuario },
      });
      const aberta = await tx.lista_Espera.findFirst({ where: { id_membro: idMembro, status: 'AGUARDANDO' } });
      const e = aberta
        ? await tx.lista_Espera.update({
            where: { id_espera: aberta.id_espera },
            data: { tentativas: { increment: 1 }, motivo: motivo || aberta.motivo },
          })
        : await tx.lista_Espera.create({
            data: { id_membro: idMembro, motivo: motivo || 'Nenhuma célula disponível no momento da triagem.' },
          });
      await tx.membro.update({ where: { id_membro: idMembro }, data: { status_membro: 'LISTA_ESPERA' } });
      return e.id_espera;
    });
    return this.um(u, id);
  }

  async registrarTentativa(u: UsuarioAutenticado, id: number) {
    const e = await this.prisma.lista_Espera.findFirst({ where: { id_espera: id, Membro: { id_igreja: u.idIgreja } } });
    if (!e) falhar(404, 'Registro não encontrado.');
    await this.prisma.lista_Espera.update({ where: { id_espera: id }, data: { tentativas: { increment: 1 } } });
    return this.um(u, id);
  }

  private async um(u: UsuarioAutenticado, id: number) {
    const e = await this.prisma.lista_Espera.findUnique({ where: { id_espera: id }, include: { Membro: { include: INCLUDE_MEMBRO } } });
    return (await this.montar(u.idIgreja, [e]))[0];
  }
}
