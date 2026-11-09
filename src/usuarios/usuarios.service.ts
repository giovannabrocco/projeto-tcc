import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../global/prisma.service';
import { PlanosService } from '../planos/planos.service';
import { MailService } from '../mail/mail.service';
import { falhar } from '../common/api-exception';
import { INCLUDE_USUARIO, mapUsuario, resumoCelula } from '../common/mappers';
import { normalizar } from '../common/util';
import { UsuarioAutenticado } from '../common/types';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planos: PlanosService,
    private readonly mail: MailService,
  ) {}

  /** Busca no tenant (usuário de outra igreja = 404, como manda o contrato). */
  private async doTenant(idIgreja: number, id: number, nome = 'Usuário') {
    const u = await this.prisma.usuario.findFirst({ where: { id_usuario: id, id_igreja: idIgreja }, include: INCLUDE_USUARIO });
    if (!u) falhar(404, `${nome} não encontrado.`);
    return u;
  }

  async listar(idIgreja: number, f: { perfil?: string; ativo?: string; q?: string }) {
    const lista = await this.prisma.usuario.findMany({
      where: {
        id_igreja: idIgreja,
        ...(f.perfil ? { perfil: f.perfil as any } : {}),
        ...(f.ativo === 'true' || f.ativo === 'false' ? { ativo: f.ativo === 'true' } : {}),
      },
      include: INCLUDE_USUARIO,
      orderBy: { nome: 'asc' },
    });
    const q = normalizar(f.q);
    return lista.filter((u) => !q || normalizar(`${u.nome} ${u.email}`).includes(q)).map(mapUsuario);
  }

  async criar(admin: UsuarioAutenticado, dto: CriarUsuarioDto) {
    await this.planos.verificarLimite(admin.idIgreja, 'usuarios');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) {
      falhar(409, 'Já existe um usuário com este e-mail.', { campos: { email: 'E-mail já cadastrado.' } });
    }
    const novo = await this.prisma.usuario.create({
      data: {
        id_igreja: admin.idIgreja,
        nome: dto.nome.trim(),
        email,
        telefone: dto.telefone ?? '',
        perfil: dto.perfil,
        senha: await bcrypt.hash(dto.senhaTemporaria, 10),
        senha_temporaria: true,
      },
      include: INCLUDE_USUARIO,
    });
    const igreja = await this.prisma.igreja.findUnique({ where: { id_igreja: admin.idIgreja } });
    void this.mail.credenciais(email, novo.nome, igreja.nome_igreja, dto.senhaTemporaria);
    return { ...mapUsuario(novo), mensagem: `Credenciais enviadas para ${email}.` };
  }

  async atualizar(admin: UsuarioAutenticado, id: number, dto: AtualizarUsuarioDto) {
    const alvo = await this.doTenant(admin.idIgreja, id);
    const email = dto.email.trim().toLowerCase();
    const dup = await this.prisma.usuario.findUnique({ where: { email } });
    if (dup && dup.id_usuario !== alvo.id_usuario) {
      falhar(409, 'Já existe um usuário com este e-mail.', { campos: { email: 'E-mail já cadastrado.' } });
    }
    const cel = alvo.celulasLideradas.find((c) => c.ativa);
    if (cel && dto.perfil !== 'LIDER') {
      falhar(409, `${alvo.nome} lidera a célula "${cel.nome_celula}". Defina outro líder antes de mudar o perfil.`);
    }
    if (alvo.id_usuario === admin.idUsuario && dto.perfil !== 'ADMINISTRADOR') {
      falhar(400, 'Você não pode remover seu próprio perfil de administrador.');
    }
    const r = await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { nome: dto.nome.trim(), email, perfil: dto.perfil, telefone: dto.telefone ?? '' },
      include: INCLUDE_USUARIO,
    });
    return mapUsuario(r);
  }

  async alterarStatus(admin: UsuarioAutenticado, id: number, ativo: boolean, confirmar = false) {
    const alvo = await this.doTenant(admin.idIgreja, id);
    if (alvo.id_usuario === admin.idUsuario) falhar(400, 'Você não pode desativar o próprio acesso.');
    if (ativo) {
      if (!alvo.ativo) await this.planos.verificarLimite(admin.idIgreja, 'usuarios');
    } else {
      const cel = alvo.celulasLideradas.find((c) => c.ativa);
      if (cel && !confirmar) {
        falhar(409, `${alvo.nome} é líder da célula "${cel.nome_celula}". A célula ficará sem líder ativo. Deseja continuar?`, {
          codigo: 'CONFIRMACAO_NECESSARIA',
        });
      }
    }
    const r = await this.prisma.usuario.update({ where: { id_usuario: id }, data: { ativo }, include: INCLUDE_USUARIO });
    return mapUsuario(r);
  }

  /** Admin define nova senha temporária para quem esqueceu e não consegue usar o e-mail. */
  async redefinirSenha(admin: UsuarioAutenticado, id: number, senhaTemporaria: string) {
    const alvo = await this.doTenant(admin.idIgreja, id);
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { senha: await bcrypt.hash(senhaTemporaria, 10), senha_temporaria: true },
    });
    const igreja = await this.prisma.igreja.findUnique({ where: { id_igreja: admin.idIgreja } });
    void this.mail.credenciais(alvo.email, alvo.nome, igreja.nome_igreja, senhaTemporaria);
    return { mensagem: `Nova senha temporária enviada para ${alvo.email}.` };
  }

  // ---- líderes (Figuras 22/23)
  private detalharLider(u: Awaited<ReturnType<UsuariosService['doTenant']>>) {
    const cel = u.celulasLideradas.find((c) => c.ativa);
    return {
      ...mapUsuario(u),
      liderDesde: u.dtahora_criado.toISOString(),
      celula: cel
        ? { ...resumoCelula(cel), capacidadeAtual: cel.capacidade_atual, capacidadeMaxima: cel.capacidade_maxima }
        : null,
      totalMembros: cel?.capacidade_atual ?? 0,
    };
  }

  async lideres(idIgreja: number, q?: string) {
    const lista = await this.prisma.usuario.findMany({
      where: { id_igreja: idIgreja, perfil: 'LIDER', ativo: true },
      include: INCLUDE_USUARIO,
      orderBy: { nome: 'asc' },
    });
    const nq = normalizar(q);
    return lista.filter((u) => !nq || normalizar(u.nome).includes(nq)).map((u) => this.detalharLider(u));
  }

  async lider(idIgreja: number, id: number) {
    const u = await this.doTenant(idIgreja, id, 'Líder');
    if (u.perfil !== 'LIDER') falhar(404, 'Líder não encontrado.');
    return this.detalharLider(u);
  }
}
