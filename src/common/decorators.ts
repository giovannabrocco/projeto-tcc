import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Perfil } from '../../generated/prisma/client';
import { RequisicaoAutenticada, UsuarioAutenticado } from './types';

export const IS_PUBLIC = 'isPublic';
export const PERFIS_KEY = 'perfis';
export const SEM_BLOQUEIO = 'semBloqueio';

/** Rota sem autenticação (login, cadastro de igreja, planos, webhook). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Restringe a rota a determinados perfis (RC03). */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);
/** Rota que continua funcionando mesmo com a assinatura bloqueada (ex.: pagar a assinatura). */
export const SemBloqueio = () => SetMetadata(SEM_BLOQUEIO, true);

/** Injeta o usuário autenticado no handler. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuario,
);
