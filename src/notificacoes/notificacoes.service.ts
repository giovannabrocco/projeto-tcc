import { Injectable } from '@nestjs/common';
import { PrismaService } from '../global/prisma.service';
import { ListaEsperaService } from '../lista-espera/lista-espera.service';
import { UsuarioAutenticado } from '../common/types';

/**
 * RF08 — notificação de vaga aberta. É calculada na consulta (sempre reflete a ocupação atual das
 * células, sem fila a manter); o que o usuário já dispensou fica em tb_notificacao_lida.
 */
@Injectable()
export class NotificacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly espera: ListaEsperaService,
  ) {}

  async listar(u: UsuarioAutenticado) {
    if (u.perfil === 'LIDER') return [];
    const itens = (await this.espera.listar(u, 'AGUARDANDO')).filter((e) => e.vagaDisponivel);
    const lidas = new Set(
      (await this.prisma.notificacao_Lida.findMany({ where: { id_usuario: u.idUsuario } })).map((l) => l.chave),
    );
    return itens
      .map((e) => ({
        id: `vaga-${e.idEspera}-${e.melhorSugestao.idCelula}`,
        tipo: 'VAGA_DISPONIVEL',
        titulo: 'Vaga compatível disponível',
        mensagem: `${e.membro.nomeCompleto} pode ser alocado(a) em ${e.melhorSugestao.nomeCelula} (${e.melhorSugestao.score}% de compatibilidade).`,
        link: `/lista-espera?membro=${e.idMembro}`,
        data: new Date().toISOString(),
      }))
      .filter((n) => !lidas.has(n.id));
  }

  async marcarLida(u: UsuarioAutenticado, id: string) {
    await this.prisma.notificacao_Lida.upsert({
      where: { id_usuario_chave: { id_usuario: u.idUsuario, chave: id } },
      create: { id_usuario: u.idUsuario, chave: id },
      update: {},
    });
    return { id, lida: true };
  }
}
