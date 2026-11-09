import { Injectable, OnModuleInit } from '@nestjs/common';
import { Plano } from '../../generated/prisma/client';
import { PrismaService } from '../global/prisma.service';
import { falhar } from '../common/api-exception';
import { env } from '../config/env';
import { PLANOS_PADRAO, Recurso } from './planos.constants';

export type Uso = Record<Recurso, number>;
export type Limites = Record<Recurso, number | null>;

export const limitesDoPlano = (p: Plano): Limites => ({
  membros: p.limite_membros,
  celulas: p.limite_celulas,
  usuarios: p.limite_usuarios,
});

export const mapPlano = (p: Plano) => ({
  idPlano: p.id_plano,
  nome: p.nome,
  descricao: p.descricao,
  valor: Number(p.valor),
  limites: limitesDoPlano(p),
  historicoMeses: p.historico_meses,
});

@Injectable()
export class PlanosService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Garante os 3 planos no banco sem sobrescrever ajustes feitos depois (preço, limites...). */
  async onModuleInit() {
    for (const p of PLANOS_PADRAO) {
      await this.prisma.plano.upsert({ where: { id_plano: p.id_plano }, create: p, update: {} });
    }
  }

  async listarAtivos() {
    const planos = await this.prisma.plano.findMany({ where: { ativo: true }, orderBy: { valor: 'asc' } });
    return { trialDias: env.trialDias, planos: planos.map(mapPlano) };
  }

  async obterAtivo(idPlano: string) {
    const plano = await this.prisma.plano.findUnique({ where: { id_plano: idPlano } });
    if (!plano || !plano.ativo) falhar(400, 'Plano inválido.', { campos: { plano: 'Plano inválido.' } });
    return plano;
  }

  async usoDaIgreja(idIgreja: number): Promise<Uso> {
    const [membros, celulas, usuarios] = await Promise.all([
      this.prisma.membro.count({ where: { id_igreja: idIgreja, status_membro: { not: 'DESLIGADO' } } }),
      this.prisma.celula.count({ where: { id_igreja: idIgreja, ativa: true } }),
      this.prisma.usuario.count({ where: { id_igreja: idIgreja, ativo: true } }),
    ]);
    return { membros, celulas, usuarios };
  }

  /** Recursos em que o uso atual passa do limite do plano informado. */
  excedidos(uso: Uso, limites: Limites): Recurso[] {
    return (Object.keys(limites) as Recurso[]).filter((k) => limites[k] !== null && uso[k] > limites[k]);
  }

  /**
   * Bloqueia a criação quando o limite do plano foi atingido (403 LIMITE_PLANO).
   * `qtd` = quantos itens serão criados agora.
   */
  async verificarLimite(idIgreja: number, recurso: Recurso, qtd = 1) {
    const ass = await this.prisma.assinatura.findUnique({ where: { id_igreja: idIgreja }, include: { Plano: true } });
    if (!ass) return;
    const limite = limitesDoPlano(ass.Plano)[recurso];
    if (limite === null) return;
    const uso = (await this.usoDaIgreja(idIgreja))[recurso];
    if (uso + qtd > limite) {
      falhar(
        403,
        `Limite do plano ${ass.Plano.nome} atingido (${limite} ${recurso}). Faça upgrade em Configurações.`,
        { codigo: 'LIMITE_PLANO' },
      );
    }
  }
}
