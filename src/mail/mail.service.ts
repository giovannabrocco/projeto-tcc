import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Envio de e-mails. Sem SMTP configurado (.env) o conteúdo é apenas LOGADO no console —
 * útil em desenvolvimento e na demonstração do TCC. Falha de e-mail nunca derruba a requisição.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transporter: nodemailer.Transporter | null = null;

  private get tx() {
    if (!this.transporter && env.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
      });
    }
    return this.transporter;
  }

  async enviar(para: string, assunto: string, texto: string) {
    try {
      if (!this.tx) {
        this.logger.log(`(SMTP não configurado) Para: ${para} | ${assunto}\n${texto}`);
        return false;
      }
      await this.tx.sendMail({ from: env.smtpFrom, to: para, subject: assunto, text: texto });
      return true;
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail para ${para}: ${(e as Error).message}`);
      return false;
    }
  }

  boasVindas(para: string, nome: string, igreja: string, diasTeste: number) {
    return this.enviar(
      para,
      'Bem-vindo ao Conectus',
      `Olá, ${nome}!\n\nA igreja ${igreja} foi cadastrada no Conectus. Você tem ${diasTeste} dias de teste gratuito.\nAcesse: ${env.frontendUrl}/login\n\nEquipe Conectus`,
    );
  }

  credenciais(para: string, nome: string, igreja: string, senhaTemporaria: string) {
    return this.enviar(
      para,
      'Seu acesso ao Conectus',
      `Olá, ${nome}!\n\nO administrador da igreja ${igreja} criou seu acesso ao Conectus.\nE-mail: ${para}\nSenha temporária: ${senhaTemporaria}\nAcesse: ${env.frontendUrl}/login\n\nTroque a senha no primeiro acesso.`,
    );
  }

  redefinirSenha(para: string, nome: string, link: string) {
    return this.enviar(
      para,
      'Redefinição de senha — Conectus',
      `Olá, ${nome}!\n\nPara criar uma nova senha acesse (válido por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail.`,
    );
  }

  aviso(para: string, assunto: string, corpo: string) {
    return this.enviar(para, assunto, `${corpo}\n\nGerencie sua assinatura: ${env.frontendUrl}/configuracoes\n\nEquipe Conectus`);
  }
}
