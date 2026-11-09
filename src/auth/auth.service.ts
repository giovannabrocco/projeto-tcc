import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../global/prisma.service';
import { MailService } from '../mail/mail.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_USUARIO, mapUsuario } from '../common/mappers';
import { resumoAcesso } from '../assinatura/situacao';
import { env } from '../config/env';
import { Usuario } from '../../generated/prisma/client';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  emitirToken(u: Pick<Usuario, 'id_usuario' | 'perfil' | 'id_igreja'>) {
    // payload do contrato: { sub, perfil, idIgreja, exp }
    return this.jwt.signAsync(
      { sub: u.id_usuario, perfil: u.perfil, idIgreja: u.id_igreja },
      { expiresIn: `${env.jwtExpiraHoras}h` },
    );
  }

  /** usuário público + situação da assinatura (o front usa para exibir o aviso de bloqueio) */
  async perfilCompleto(idUsuario: number) {
    const u = await this.prisma.usuario.findUnique({
      where: { id_usuario: idUsuario },
      include: { ...INCLUDE_USUARIO, igreja: { include: { assinatura: true } } },
    });
    if (!u) falhar(404, 'Usuário não encontrado.');
    const ass = u.igreja.assinatura;
    return { usuario: mapUsuario(u), assinatura: ass ? resumoAcesso(ass) : null };
  }

  async login(email: string, senha: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { igreja: true },
    });
    // mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    const ok = u ? await bcrypt.compare(senha, u.senha) : await bcrypt.compare(senha, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    if (!u || !ok) falhar(401, 'E-mail ou senha inválidos.');
    if (!u.ativo || !u.igreja.ativo) falhar(403, 'Usuário desativado. Procure o administrador.');

    const { usuario, assinatura } = await this.perfilCompleto(u.id_usuario);
    return { token: await this.emitirToken(u), usuario, assinatura };
  }

  async me(idUsuario: number) {
    const { usuario, assinatura } = await this.perfilCompleto(idUsuario);
    return { ...usuario, assinatura };
  }

  async alterarSenha(idUsuario: number, senhaAtual: string, novaSenha: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id_usuario: idUsuario } });
    if (!u || !(await bcrypt.compare(senhaAtual, u.senha)))
      falhar(400, 'Senha atual incorreta.', { campos: { senhaAtual: 'Senha atual incorreta.' } });
    await this.prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: { senha: await bcrypt.hash(novaSenha, 10), senha_temporaria: false },
    });
    return { mensagem: 'Senha alterada com sucesso.' };
  }

  /** Sempre responde igual, exista o e-mail ou não (evita enumeração de usuários). */
  async esqueciSenha(email: string) {
    const u = await this.prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (u?.ativo) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.token_Senha.create({
        data: { id_usuario: u.id_usuario, token_hash: sha256(token), expira_em: new Date(Date.now() + 3600_000) },
      });
      await this.mail.redefinirSenha(u.email, u.nome, `${env.frontendUrl}/redefinir-senha?token=${token}`);
    }
    return { mensagem: 'Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.' };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const reg = await this.prisma.token_Senha.findUnique({ where: { token_hash: sha256(token) } });
    if (!reg || reg.usado_em || reg.expira_em < new Date())
      falhar(400, 'Link inválido ou expirado. Solicite uma nova redefinição.', { codigo: 'TOKEN_INVALIDO' });
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id_usuario: reg.id_usuario },
        data: { senha: await bcrypt.hash(novaSenha, 10), senha_temporaria: false },
      }),
      this.prisma.token_Senha.update({ where: { id_token: reg.id_token }, data: { usado_em: new Date() } }),
    ]);
    return { mensagem: 'Senha redefinida. Entre com a nova senha.' };
  }
}
