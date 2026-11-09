import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { falhar } from '../common/api-exception';

/** Painel interno do dono do SaaS: exige o cabeçalho x-plataforma-key = PLATAFORMA_ADMIN_KEY. */
@Injectable()
export class PlataformaGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const chave = env.plataformaKey;
    if (!chave) falhar(503, 'Painel da plataforma desativado (defina PLATAFORMA_ADMIN_KEY).');
    const enviada = String(ctx.switchToHttp().getRequest().headers['x-plataforma-key'] ?? '');
    const a = Buffer.from(enviada);
    const b = Buffer.from(chave);
    if (a.length !== b.length || !timingSafeEqual(a, b)) falhar(401, 'Chave da plataforma inválida.');
    return true;
  }
}
