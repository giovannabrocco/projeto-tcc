import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../global/prisma.service';
import { PlanosService, limitesDoPlano } from '../planos/planos.service';
import { AuthService } from '../auth/auth.service';
import { AssinaturaService } from '../assinatura/assinatura.service';
import { MailService } from '../mail/mail.service';
import { resumoAcesso } from '../assinatura/situacao';
import { INCLUDE_USUARIO, mapUsuario } from '../common/mappers';
import { falhar } from '../common/api-exception';
import { addDias } from '../common/util';
import { env } from '../config/env';
import { UsuarioAutenticado } from '../common/types';
import { AtualizarIgrejaDto, CriarIgrejaDto } from './igrejas.dto';

@Injectable()
export class IgrejasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planos: PlanosService,
    private readonly auth: AuthService,
    private readonly assinatura: AssinaturaService,
    private readonly mail: MailService,
  ) {}

  /** Formato do contrato: GET /igrejas/atual */
  private async montar(idIgreja: number) {
    const ig = await this.prisma.igreja.findUnique({
      where: { id_igreja: idIgreja },
      include: { assinatura: { include: { Plano: true } } },
    });
    if (!ig) falhar(404, 'Igreja não encontrada.');
    const ass = ig.assinatura;
    return {
      idIgreja: ig.id_igreja,
      nomeIgreja: ig.nome_igreja,
      denominacao: ig.denominacao,
      cidade: ig.cidade,
      estado: ig.estado,
      telefone: ig.telefone ?? '',
      plano: ass?.id_plano ?? null,
      ativo: ig.ativo,
      dataCadastro: ig.dtahora_criado.toISOString(),
      uso: await this.planos.usoDaIgreja(idIgreja),
      limites: ass ? limitesDoPlano(ass.Plano) : null,
      assinatura: ass ? resumoAcesso(ass) : null,
    };
  }

  atual(idIgreja: number) {
    return this.montar(idIgreja);
  }

  async atualizar(u: UsuarioAutenticado, dto: AtualizarIgrejaDto) {
    await this.prisma.igreja.update({
      where: { id_igreja: u.idIgreja },
      data: {
        nome_igreja: dto.nomeIgreja.trim(),
        denominacao: dto.denominacao?.trim() ?? '',
        cidade: dto.cidade.trim(),
        estado: dto.estado.toUpperCase(),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone } : {}),
      },
    });
    const ass = await this.prisma.assinatura.findUnique({ where: { id_igreja: u.idIgreja } });
    if (dto.plano && ass && dto.plano !== ass.id_plano) await this.assinatura.trocarPlano(u, dto.plano);
    return this.montar(u.idIgreja);
  }

  /**
   * Cadastro de assinante (RF05): cria a igreja (tenant), o 1º administrador e a assinatura em
   * período de TESTE (TRIAL_DIAS; 0 = pagar antes de usar). Devolve já o token para entrar direto.
   * O pagamento é feito em seguida com POST /assinatura/checkout.
   */
  async criar(dto: CriarIgrejaDto) {
    const email = dto.administrador.email.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) {
      falhar(409, 'Já existe um usuário com este e-mail.', { campos: { email: 'E-mail já cadastrado.' } });
    }
    const plano = await this.planos.obterAtivo(dto.igreja.plano);
    const senha = await bcrypt.hash(dto.administrador.senha, 10);
    const agora = new Date();

    const { igreja, usuario } = await this.prisma.$transaction(async (tx) => {
      const igreja = await tx.igreja.create({
        data: {
          nome_igreja: dto.igreja.nomeIgreja.trim(),
          denominacao: dto.igreja.denominacao?.trim() ?? '',
          cidade: dto.igreja.cidade.trim(),
          estado: dto.igreja.estado.toUpperCase(),
          telefone: dto.igreja.telefone ?? null,
        },
      });
      const usuario = await tx.usuario.create({
        data: {
          id_igreja: igreja.id_igreja,
          nome: dto.administrador.nome.trim(),
          email,
          telefone: dto.administrador.telefone ?? '',
          senha,
          perfil: 'ADMINISTRADOR',
        },
        include: INCLUDE_USUARIO,
      });
      await tx.assinatura.create({
        data: {
          id_igreja: igreja.id_igreja,
          id_plano: plano.id_plano,
          status: 'TESTE',
          dta_inicio_teste: agora,
          dta_fim_teste: addDias(agora, env.trialDias),
        },
      });
      return { igreja, usuario };
    });

    void this.mail.boasVindas(email, usuario.nome, igreja.nome_igreja, env.trialDias);
    return {
      igreja: await this.montar(igreja.id_igreja),
      token: await this.auth.emitirToken(usuario),
      usuario: mapUsuario(usuario),
    };
  }
}
