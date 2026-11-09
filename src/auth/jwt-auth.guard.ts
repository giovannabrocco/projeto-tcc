import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../global/prisma.service';
import { IS_PUBLIC, PERFIS_KEY, SEM_BLOQUEIO } from '../common/decorators';
import { falhar } from '../common/api-exception';
import { RequisicaoAutenticada } from '../common/types';
import { avaliarAcesso } from '../assinatura/situacao';
import { Perfil } from '../../generated/prisma/client';

/**
 * Guard global (única porta de entrada das rotas):
 *  1) autenticação JWT (RNF02) — o idIgreja vem do token/banco, nunca do corpo (RF05);
 *  2) perfil exigido pela rota (@Perfis) — RC03;
 *  3) assinatura: sem acesso => somente leitura (GET), exceto rotas @SemBloqueio.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, alvos)) return true;

    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const cab = req.headers.authorization ?? '';
    const token = cab.startsWith('Bearer ') ? cab.slice(7) : null;
    if (!token) falhar(401, 'Sessão expirada. Entre novamente.');

    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      return falhar(401, 'Sessão expirada. Entre novamente.');
    }

    // Sempre confere no banco: usuário desativado ou igreja suspensa perde acesso na hora.
    const u = await this.prisma.usuario.findUnique({
      where: { id_usuario: Number(payload.sub) },
      include: { igreja: { include: { assinatura: true } } },
    });
    if (!u || !u.ativo || !u.igreja.ativo) return falhar(401, 'Sessão expirada. Entre novamente.');

    req.usuario = { idUsuario: u.id_usuario, nome: u.nome, email: u.email, perfil: u.perfil, idIgreja: u.id_igreja };

    const perfis = this.reflector.getAllAndOverride<Perfil[]>(PERFIS_KEY, alvos);
    if (perfis?.length && !perfis.includes(u.perfil)) {
      falhar(403, 'Seu perfil não tem acesso a esta funcionalidade.');
    }

    const metodoLeitura = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const semBloqueio = this.reflector.getAllAndOverride<boolean>(SEM_BLOQUEIO, alvos);
    const ass = u.igreja.assinatura;
    if (!metodoLeitura && !semBloqueio && ass) {
      const sit = avaliarAcesso(ass);
      if (!sit.liberado) {
        falhar(403, mensagemBloqueio(sit.motivoBloqueio, u.perfil === 'ADMINISTRADOR'), {
          codigo: 'ASSINATURA_BLOQUEADA',
        });
      }
    }
    return true;
  }
}

function mensagemBloqueio(motivo: string | null, admin: boolean) {
  const base = {
    TESTE_ENCERRADO: 'O período de teste gratuito terminou.',
    PAGAMENTO_ATRASADO: 'O pagamento da assinatura está em atraso.',
    ASSINATURA_CANCELADA: 'A assinatura foi cancelada.',
    ASSINATURA_EXPIRADA: 'A assinatura expirou.',
  }[motivo ?? 'ASSINATURA_EXPIRADA'];
  return `${base} O sistema está em modo somente leitura. ${
    admin ? 'Regularize em Configurações > Assinatura.' : 'Peça ao administrador da igreja para regularizar a assinatura.'
  }`;
}
