import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/global/prisma.service';
import { GeoService } from '../src/geo/geo.service';
import { MailService } from '../src/mail/mail.service';
import { MercadoPagoService } from '../src/assinatura/mercadopago.service';
import { AssinaturaService } from '../src/assinatura/assinatura.service';
import { GeoFake, MailFake, MpFake } from './fakes';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://conectus:conectus@localhost:5432/conectus_test';
process.env.JWT_SECRET = 'teste-e2e-secreto-conectus';
process.env.PLATAFORMA_ADMIN_KEY = 'chave-plataforma-teste';
process.env.TRIAL_DIAS = '7';
process.env.CARENCIA_DIAS = '5';

describe('Conectus API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mp: MpFake;
  let mail: MailFake;
  let assinaturaSvc: AssinaturaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const dia = (n: number) => new Date(Date.now() + n * 86400000);

  // estado compartilhado entre os passos
  const S: Record<string, any> = {};

  beforeAll(async () => {
    const boot = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeoService).useClass(GeoFake)
      .overrideProvider(MailService).useClass(MailFake)
      .overrideProvider(MercadoPagoService).useClass(MpFake)
      .compile();
    app = configurarApp(boot.createNestApplication());
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      `TRUNCATE tb_evento_pagamento, tb_desconto, tb_promocao, tb_fatura, tb_assinatura, tb_notificacao_lida, tb_feedback,
       tb_lista_espera, tb_log_triagem, tb_historico_celulas, tb_disponibilidade_membro, tb_membro, tb_celula,
       tb_token_senha, tb_usuario, tb_igreja RESTART IDENTITY CASCADE`,
    );
    await app.init();
    mp = app.get(MercadoPagoService) as any;
    mail = app.get(MailService) as any;
    assinaturaSvc = app.get(AssinaturaService);
  });
  afterAll(async () => { await app.close(); });

  // ------------------------------------------------------------------ cadastro de assinante
  describe('Landing / cadastro', () => {
    it('GET /planos é público e lista os 3 planos', async () => {
      const r = await api().get('/api/planos').expect(200);
      expect(r.body.planos.map((p: any) => p.idPlano)).toEqual(['ESSENCIAL', 'INTERMEDIARIO', 'PREMIUM']);
      expect(r.body.planos[2].limites.membros).toBeNull();
      expect(r.body.trialDias).toBe(7);
    });

    it('rota protegida sem token => 401 no formato do contrato', async () => {
      const r = await api().get('/api/membros').expect(401);
      expect(r.body.message).toBeDefined();
    });

    it('POST /igrejas valida campos (400 com mapa de campos)', async () => {
      const r = await api().post('/api/igrejas').send({
        igreja: { nomeIgreja: '', cidade: 'SP', estado: 'SP', plano: 'ESSENCIAL' },
        administrador: { nome: 'Ana', email: 'x', senha: '123' },
      }).expect(400);
      expect(r.body.campos['igreja.nomeIgreja']).toBeDefined();
      expect(r.body.campos['administrador.email']).toBeDefined();
      expect(r.body.campos['administrador.senha']).toBeDefined();
    });

    it('POST /igrejas cria igreja + admin + assinatura em teste e já devolve token', async () => {
      const r = await api().post('/api/igrejas').send({
        igreja: { nomeIgreja: 'Igreja Batista Nova Vida', denominacao: 'Batista', cidade: 'São Paulo', estado: 'SP', plano: 'ESSENCIAL' },
        administrador: { nome: 'Pastor Paulo', email: 'Paulo@Nova.com', senha: 'senha-forte-1' },
      }).expect(201);
      expect(r.body.token).toBeTruthy();
      expect(r.body.usuario.perfil).toBe('ADMINISTRADOR');
      expect(r.body.usuario.email).toBe('paulo@nova.com');
      expect(r.body.igreja.plano).toBe('ESSENCIAL');
      expect(r.body.igreja.assinatura.status).toBe('TESTE');
      expect(r.body.igreja.assinatura.diasRestantes).toBe(7);
      expect(r.body.igreja.limites).toEqual({ membros: 100, celulas: 5, usuarios: 3 });
      S.admin = r.body.token;
      S.idIgreja = r.body.igreja.idIgreja;
      expect(mail.enviados.some((m) => m.assunto === 'boas-vindas')).toBe(true);
    });

    it('e-mail duplicado => 409 com campo', async () => {
      const r = await api().post('/api/igrejas').send({
        igreja: { nomeIgreja: 'Outra', cidade: 'SP', estado: 'SP', plano: 'PREMIUM' },
        administrador: { nome: 'Outro', email: 'paulo@nova.com', senha: 'senha-forte-1' },
      }).expect(409);
      expect(r.body.campos.email).toBeDefined();
    });
  });

  // ------------------------------------------------------------------ auth
  describe('Autenticação', () => {
    it('login correto devolve token + usuário + situação da assinatura', async () => {
      const r = await api().post('/api/auth/login').send({ email: 'paulo@nova.com', senha: 'senha-forte-1' }).expect(201);
      expect(r.body.token).toBeTruthy();
      expect(r.body.assinatura.liberado).toBe(true);
      expect(r.body.usuario.senha).toBeUndefined();
    });
    it('senha errada e e-mail inexistente => 401 com a mesma mensagem', async () => {
      const a = await api().post('/api/auth/login').send({ email: 'paulo@nova.com', senha: 'errada' }).expect(401);
      const b = await api().post('/api/auth/login').send({ email: 'ninguem@x.com', senha: 'errada' }).expect(401);
      expect(a.body.message).toBe(b.body.message);
    });
    it('GET /auth/me', async () => {
      const r = await api().get('/api/auth/me').set(auth(S.admin)).expect(200);
      expect(r.body.nome).toBe('Pastor Paulo');
    });
    it('esqueci/redefinir senha', async () => {
      await api().post('/api/auth/esqueci-senha').send({ email: 'paulo@nova.com' }).expect(201);
      const link = mail.enviados.filter((m) => m.assunto === 'redefinir').pop()!.texto;
      const token = link.split('token=')[1];
      await api().post('/api/auth/redefinir-senha').send({ token, novaSenha: 'nova-senha-123' }).expect(201);
      await api().post('/api/auth/redefinir-senha').send({ token, novaSenha: 'outra-senha-123' }).expect(400); // token de uso único
      await api().post('/api/auth/login').send({ email: 'paulo@nova.com', senha: 'nova-senha-123' }).expect(201);
      // volta a senha para os próximos testes
      await api().post('/api/auth/alterar-senha').set(auth(S.admin)).send({ senhaAtual: 'nova-senha-123', novaSenha: 'senha-forte-1' }).expect(201);
    });
    it('esqueci-senha não revela se o e-mail existe', async () => {
      const r = await api().post('/api/auth/esqueci-senha').send({ email: 'nao-existe@x.com' }).expect(201);
      expect(r.body.mensagem).toBeDefined();
    });
  });

  // ------------------------------------------------------------------ usuários e limites do plano
  describe('Usuários e limite do plano', () => {
    it('admin cria voluntário e líder; credenciais saem por e-mail', async () => {
      const v = await api().post('/api/usuarios').set(auth(S.admin)).send({ nome: 'Carolina Voluntária', email: 'carol@nova.com', perfil: 'VOLUNTARIO', senhaTemporaria: 'temporaria-1' }).expect(201);
      expect(v.body.senhaTemporaria).toBe(true);
      expect(mail.enviados.some((m) => m.assunto === 'credenciais' && m.para === 'carol@nova.com')).toBe(true);
      const l = await api().post('/api/usuarios').set(auth(S.admin)).send({ nome: 'Pedro Líder', email: 'pedro@nova.com', perfil: 'LIDER', senhaTemporaria: 'temporaria-1' }).expect(201);
      S.idLider1 = l.body.idUsuario;
      S.idVol = v.body.idUsuario;
      S.vol = (await api().post('/api/auth/login').send({ email: 'carol@nova.com', senha: 'temporaria-1' })).body.token;
      S.lider1 = (await api().post('/api/auth/login').send({ email: 'pedro@nova.com', senha: 'temporaria-1' })).body.token;
    });
    it('4º usuário no plano Essencial (limite 3) => 403 LIMITE_PLANO', async () => {
      const r = await api().post('/api/usuarios').set(auth(S.admin)).send({ nome: 'Quarto', email: 'q@nova.com', perfil: 'LIDER', senhaTemporaria: 'temporaria-1' }).expect(403);
      expect(r.body.codigo).toBe('LIMITE_PLANO');
    });
    it('voluntário não acessa /usuarios (RC03)', async () => {
      await api().get('/api/usuarios').set(auth(S.vol)).expect(403);
    });
    it('troca de plano durante o teste é imediata (Intermediário) e libera mais usuários', async () => {
      const r = await api().post('/api/assinatura/plano').set(auth(S.admin)).send({ plano: 'INTERMEDIARIO' }).expect(200);
      expect(r.body.planoId).toBe('INTERMEDIARIO');
      for (const [n, e] of [['Lider 2', 'l2@nova.com'], ['Lider 3', 'l3@nova.com']]) {
        const u = await api().post('/api/usuarios').set(auth(S.admin)).send({ nome: n, email: e, perfil: 'LIDER', senhaTemporaria: 'temporaria-1' }).expect(201);
        S[e] = u.body.idUsuario;
      }
    });
    it('admin não pode desativar a si mesmo', async () => {
      const me = await api().get('/api/auth/me').set(auth(S.admin));
      await api().patch(`/api/usuarios/${me.body.idUsuario}/status`).set(auth(S.admin)).send({ ativo: false }).expect(400);
    });
  });

  // ------------------------------------------------------------------ células
  describe('Células', () => {
    const base = { capacidadeMaxima: 20, horario: '20:00', diaSemana: 'QUA', perfilGrupo: 'JOVENS', faixaEtaria: '18-28', cep: '04010-100', bairro: 'Vila Mariana' };
    it('cria célula geocodificando o CEP; só admin pode', async () => {
      await api().post('/api/celulas').set(auth(S.vol)).send({ ...base, nomeCelula: 'X', idLider: S.idLider1 }).expect(403);
      const r = await api().post('/api/celulas').set(auth(S.admin)).send({ ...base, nomeCelula: 'Vila Mariana - Jovens', idLider: S.idLider1 }).expect(201);
      expect(r.body.latitude).toBeCloseTo(-23.5893, 3);
      expect(r.body.vagas).toBe(20);
      expect(r.body.faixaEtaria).toBe('18-28');
      S.cel1 = r.body.idCelula;
    });
    it('líder que já tem célula ativa => 409', async () => {
      await api().post('/api/celulas').set(auth(S.admin)).send({ ...base, nomeCelula: 'Dup', idLider: S.idLider1 }).expect(409);
    });
    it('cria células pequena (capacidade 1) e feminina; valida usuário que não é líder', async () => {
      await api().post('/api/celulas').set(auth(S.admin)).send({ ...base, nomeCelula: 'Inv', idLider: S.idVol }).expect(400);
      const c2 = await api().post('/api/celulas').set(auth(S.admin)).send({ ...base, nomeCelula: 'Pinheiros - Mini', capacidadeMaxima: 1, cep: '05422-000', bairro: 'Pinheiros', idLider: S['l2@nova.com'] }).expect(201);
      S.cel2 = c2.body.idCelula;
      const c3 = await api().post('/api/celulas').set(auth(S.admin)).send({ ...base, nomeCelula: 'Santana - Mulheres', perfilGrupo: 'MULHERES', cep: '02010-000', bairro: 'Santana', idLider: S['l3@nova.com'] }).expect(201);
      S.cel3 = c3.body.idCelula;
    });
    it('CEP inexistente => 400', async () => {
      // edição de célula existente com CEP inválido (líder é o dela mesma, sem conflito)
      const r = await api().put(`/api/celulas/${S.cel1}`).set(auth(S.admin)).send({ ...base, nomeCelula: 'Vila Mariana - Jovens', cep: '00000-000', idLider: S.idLider1 }).expect(400);
      expect(r.body.campos.cep).toBeDefined();
    });
    it('GET /celulas e filtros', async () => {
      const r = await api().get('/api/celulas?comVagas=true&dia=QUA').set(auth(S.vol)).expect(200);
      expect(r.body).toHaveLength(3);
      const rr = await api().get(`/api/celulas/${S.cel1}`).set(auth(S.vol)).expect(200);
      expect(rr.body.integrantes).toEqual([]);
      expect(rr.body.proximaReuniao).toBeTruthy();
    });
  });

  // ------------------------------------------------------------------ membros + triagem
  describe('Membros e triagem', () => {
    const membro = (nome: string, extra: any = {}) => ({
      nomeCompleto: nome, dataNascimento: '2002-05-10', genero: 'F', estadoCivil: 'SOLTEIRO', telefone: '(11) 91234-5678',
      cep: '04010-100', bairro: 'Vila Mariana', perfilInteresse: 'JOVENS',
      disponibilidades: [{ diaSemana: 'QUA', horarioInicio: '19:00', horarioFim: '22:00' }], ...extra,
    });

    it('voluntário cadastra membro (status inicial AGUARDANDO_TRIAGEM, telefone com DDD cabe)', async () => {
      const r = await api().post('/api/membros').set(auth(S.vol)).send(membro('Mariana Costa', { email: 'mari@x.com' })).expect(201);
      expect(r.body.statusMembro).toBe('AGUARDANDO_TRIAGEM');
      expect(r.body.telefone).toBe('(11) 91234-5678');
      expect(r.body.idade).toBeGreaterThanOrEqual(24);
      expect(r.body.disponibilidades).toHaveLength(1);
      expect(r.body.latitude).toBeCloseTo(-23.5893, 3);
      S.m1 = r.body.idMembro;
    });
    it('validações: telefone curto, data futura, e-mail duplicado', async () => {
      await api().post('/api/membros').set(auth(S.vol)).send(membro('Ana', { telefone: '123' })).expect(400);
      await api().post('/api/membros').set(auth(S.vol)).send(membro('Ana Futuro', { dataNascimento: '2999-01-01' })).expect(400);
      const r = await api().post('/api/membros').set(auth(S.vol)).send(membro('Mariana Dup', { email: 'mari@x.com' })).expect(409);
      expect(r.body.campos.email).toBeDefined();
    });
    it('líder não cadastra membro (403)', async () => {
      await api().post('/api/membros').set(auth(S.lider1)).send(membro('Nope')).expect(403);
    });

    it('GET /triagem/pendentes traz a melhor sugestão com escore', async () => {
      const r = await api().get('/api/triagem/pendentes').set(auth(S.vol)).expect(200);
      expect(r.body).toHaveLength(1);
      expect(r.body[0].melhorSugestao.idCelula).toBe(S.cel1);
      expect(r.body[0].melhorSugestao.score).toBeGreaterThanOrEqual(90);
      expect(r.body[0].melhorSugestao.compativel).toBe(true);
    });

    it('matching: até 3 sugestões, ordenadas, com critérios; grava logs; < 3 s', async () => {
      const r = await api().post(`/api/triagem/${S.m1}/matching`).set(auth(S.vol)).expect(200);
      expect(r.body.sugestoes.length).toBeGreaterThanOrEqual(2);
      expect(r.body.sugestoes.length).toBeLessThanOrEqual(3);
      const scores = r.body.sugestoes.map((s: any) => s.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
      expect(r.body.sugestoes[0].celula.idCelula).toBe(S.cel1);
      expect(r.body.sugestoes[0].criterios.distancia.peso).toBe(0.4);
      expect(r.body.tempoMs).toBeLessThan(3000);
      expect(r.body.scoreMinimo).toBe(65);
      S.log1 = r.body.sugestoes[0].idLog;
      const logs = await prisma.log_Triagem.count({ where: { id_membro: S.m1, status_triagem: 'SUGERIDA' } });
      expect(logs).toBe(r.body.sugestoes.length);
    });

    it('alocação automática: aprova o log, rejeita as demais, incrementa capacidade e abre histórico', async () => {
      const r = await api().post(`/api/triagem/${S.m1}/alocacao`).set(auth(S.vol)).send({ idCelula: S.cel1, modo: 'AUTOMATICA', idLog: S.log1 }).expect(200);
      expect(r.body.membro.statusMembro).toBe('ALOCADO');
      expect(r.body.celula.capacidadeAtual).toBe(1);
      const logs = await prisma.log_Triagem.findMany({ where: { id_membro: S.m1 } });
      expect(logs.filter((l) => l.status_triagem === 'APROVADA')).toHaveLength(1);
      expect(logs.filter((l) => l.status_triagem === 'SUGERIDA')).toHaveLength(0);
      const h = await prisma.historico_Celulas.findMany({ where: { id_membro: S.m1 } });
      expect(h).toHaveLength(1);
      expect(h[0].dta_saida).toBeNull();
    });
    it('alocar de novo o mesmo membro => 409 JA_TRIADO', async () => {
      const r = await api().post(`/api/triagem/${S.m1}/alocacao`).set(auth(S.vol)).send({ idCelula: S.cel1 }).expect(409);
      expect(r.body.codigo).toBe('JA_TRIADO');
    });

    it('RC06 + concorrência: 2 voluntários disputam a última vaga => exatamente 1 sucesso e 1 CELULA_LOTADA', async () => {
      const a = (await api().post('/api/membros').set(auth(S.vol)).send(membro('Disputa A'))).body.idMembro;
      const b = (await api().post('/api/membros').set(auth(S.vol)).send(membro('Disputa B'))).body.idMembro;
      const [ra, rb] = await Promise.all([
        api().post(`/api/triagem/${a}/alocacao`).set(auth(S.vol)).send({ idCelula: S.cel2 }),
        api().post(`/api/triagem/${b}/alocacao`).set(auth(S.admin)).send({ idCelula: S.cel2 }),
      ]);
      expect([ra.status, rb.status].sort()).toEqual([200, 409]);
      expect([ra.body.codigo, rb.body.codigo]).toContain('CELULA_LOTADA');
      const cel = await prisma.celula.findUnique({ where: { id_celula: S.cel2 } });
      expect(cel.capacidade_atual).toBe(1); // nunca passa da capacidade
      S.perdedor = ra.status === 409 ? a : b;
      S.vencedor = ra.status === 200 ? a : b;
      // o perdedor continua pendente (a transação desfez a reivindicação)
      const m = await prisma.membro.findUnique({ where: { id_membro: S.perdedor } });
      expect(m.status_membro).toBe('AGUARDANDO_TRIAGEM');
    });

    it('matching não sugere célula lotada nem de gênero incompatível', async () => {
      const homem = (await api().post('/api/membros').set(auth(S.vol)).send(membro('Carlos Homem', { genero: 'M' }))).body.idMembro;
      S.homem = homem;
      const r = await api().post(`/api/triagem/${homem}/matching`).set(auth(S.vol)).expect(200);
      const ids = r.body.sugestoes.map((s: any) => s.celula.idCelula);
      expect(ids).not.toContain(S.cel2); // lotada
      expect(ids).not.toContain(S.cel3); // célula de mulheres
    });

    it('triagem manual registra log APROVADA com modo MANUAL', async () => {
      const r = await api().post(`/api/triagem/${S.homem}/alocacao`).set(auth(S.vol)).send({ idCelula: S.cel1, modo: 'MANUAL' }).expect(200);
      expect(r.body.modo).toBe('MANUAL');
      const log = await prisma.log_Triagem.findUnique({ where: { id_log: r.body.idLog } });
      expect((log.criterios_score as any).modo).toBe('MANUAL');
    });

    it('rejeição de sugestão', async () => {
      const m = (await api().post('/api/membros').set(auth(S.vol)).send(membro('Rejeita'))).body.idMembro;
      const mt = await api().post(`/api/triagem/${m}/matching`).set(auth(S.vol));
      await api().post(`/api/triagem/${m}/rejeicao`).set(auth(S.vol)).send({ idLog: mt.body.sugestoes[0].idLog, motivo: 'Prefere sábados' }).expect(200);
      const logs = await api().get(`/api/triagem/${m}/logs`).set(auth(S.vol)).expect(200);
      expect(logs.body.find((l: any) => l.motivoRejeicao === 'Prefere sábados')).toBeTruthy();
      S.mRej = m;
    });

    it('perfil Líder só vê membros da própria célula (e 403 nos demais)', async () => {
      const lista = await api().get('/api/membros').set(auth(S.lider1)).expect(200);
      expect(lista.body.map((m: any) => m.idMembro).sort()).toEqual([S.m1, S.homem].sort());
      await api().get(`/api/membros/${S.perdedor}`).set(auth(S.lider1)).expect(403);
      const det = await api().get(`/api/membros/${S.m1}`).set(auth(S.lider1)).expect(200);
      expect(det.body.historico).toHaveLength(1);
      expect(det.body.logs.length).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------------------------------ lista de espera + notificações + saída
  describe('Lista de espera, notificações e saída', () => {
    it('membro sem célula vai para a lista de espera; tentativas incrementam', async () => {
      const r = await api().post('/api/lista-espera').set(auth(S.vol)).send({ idMembro: S.perdedor, motivo: 'Célula lotada' }).expect(201);
      expect(r.body.tentativas).toBe(1);
      expect(r.body.membro.statusMembro).toBe('LISTA_ESPERA');
      const t = await api().post(`/api/lista-espera/${r.body.idEspera}/tentativas`).set(auth(S.vol)).expect(200);
      expect(t.body.tentativas).toBe(2);
      S.espera = r.body.idEspera;
    });
    it('quando abre vaga compatível, aparece notificação (RF08) e pode ser dispensada', async () => {
      // a célula 1 ainda tem vagas => já há vaga compatível para quem está na espera
      const n = await api().get('/api/notificacoes').set(auth(S.vol)).expect(200);
      expect(n.body.length).toBeGreaterThan(0);
      expect(n.body[0].tipo).toBe('VAGA_DISPONIVEL');
      await api().patch(`/api/notificacoes/${encodeURIComponent(n.body[0].id)}`).set(auth(S.vol)).send({ lida: true }).expect(200);
      const depois = await api().get('/api/notificacoes').set(auth(S.vol)).expect(200);
      expect(depois.body).toHaveLength(0);
      expect((await api().get('/api/notificacoes').set(auth(S.lider1))).body).toEqual([]);
    });
    it('alocar quem estava na espera resolve o registro da espera', async () => {
      await api().post(`/api/triagem/${S.perdedor}/alocacao`).set(auth(S.vol)).send({ idCelula: S.cel1 }).expect(200);
      const e = await prisma.lista_Espera.findUnique({ where: { id_espera: S.espera } });
      expect(e.status).toBe('RESOLVIDO');
    });
    it('líder registra saída: fecha histórico, devolve a vaga e reencaminha', async () => {
      const antes = (await prisma.celula.findUnique({ where: { id_celula: S.cel1 } })).capacidade_atual;
      await api().post(`/api/membros/${S.homem}/saida`).set(auth(S.lider1)).send({ motivo: '' }).expect(400);
      const r = await api().post(`/api/membros/${S.homem}/saida`).set(auth(S.lider1)).send({ motivo: 'Mudou de cidade', reencaminhar: true }).expect(200);
      expect(r.body.statusMembro).toBe('AGUARDANDO_TRIAGEM');
      expect((await prisma.celula.findUnique({ where: { id_celula: S.cel1 } })).capacidade_atual).toBe(antes - 1);
      const h = await prisma.historico_Celulas.findFirst({ where: { id_membro: S.homem } });
      expect(h.motivo_saida).toBe('Mudou de cidade');
      expect(h.dta_saida).not.toBeNull();
    });
    it('líder não registra saída de membro de outra célula (403)', async () => {
      await api().post(`/api/membros/${S.vencedor}/saida`).set(auth(S.lider1)).send({ motivo: 'x' }).expect(403);
    });
    it('desativar célula com membros exige confirmação e devolve os membros para a triagem', async () => {
      const r1 = await api().patch(`/api/celulas/${S.cel2}/status`).set(auth(S.admin)).send({ ativa: false }).expect(409);
      expect(r1.body.codigo).toBe('CONFIRMACAO_NECESSARIA');
      const r2 = await api().patch(`/api/celulas/${S.cel2}/status`).set(auth(S.admin)).send({ ativa: false, confirmar: true }).expect(200);
      expect(r2.body.membrosRedistribuir).toBe(1);
      expect(r2.body.ativa).toBe(false);
      const m = await prisma.membro.findUnique({ where: { id_membro: S.vencedor } });
      expect(m.status_membro).toBe('AGUARDANDO_TRIAGEM');
      expect(m.id_celula_alocada).toBeNull();
    });
  });

  // ------------------------------------------------------------------ feedback
  describe('Feedback', () => {
    it('líder registra feedback de membro da sua célula; valida nota e célula', async () => {
      const ac = await api().get('/api/feedbacks/acompanhamento').set(auth(S.lider1)).expect(200);
      expect(ac.body.celula.idCelula).toBe(S.cel1);
      expect(ac.body.itens.length).toBeGreaterThan(0);
      await api().post('/api/feedbacks').set(auth(S.lider1)).send({ idMembro: S.m1, statusAdaptacao: 'PARTICIPANDO', notaIntegracao: 9 }).expect(400);
      const r = await api().post('/api/feedbacks').set(auth(S.lider1)).send({ idMembro: S.m1, statusAdaptacao: 'PARTICIPANDO', notaIntegracao: 5, avaliacaoLider: 'Bem recebida' }).expect(201);
      expect(r.body.idLogTriagem).toBeTruthy();
      await api().post('/api/feedbacks').set(auth(S.lider1)).send({ idMembro: S.vencedor, statusAdaptacao: 'RESPONDEU' }).expect(403);
      await api().post('/api/feedbacks').set(auth(S.vol)).send({ idMembro: S.m1, statusAdaptacao: 'RESPONDEU' }).expect(403);
    });
  });

  // ------------------------------------------------------------------ relatórios, busca, multitenância
  describe('Relatórios, busca e isolamento entre igrejas', () => {
    it('dashboard (resumo) tem KPIs coerentes', async () => {
      const r = await api().get('/api/relatorios/resumo').set(auth(S.vol)).expect(200);
      expect(r.body.kpis.membrosAtivos).toBe(2); // m1 e perdedor na cel1
      expect(r.body.kpis.celulasAtivas).toBe(2);
      expect(r.body.kpis.mediaIntegracao).toBe(5);
      expect(r.body.novosPorMes).toHaveLength(6);
      expect(r.body.atividadeRecente.length).toBeGreaterThan(0);
    });
    it('relatórios do admin; voluntário recebe 403', async () => {
      await api().get('/api/relatorios/ocupacao').set(auth(S.vol)).expect(403);
      const o = await api().get('/api/relatorios/ocupacao').set(auth(S.admin)).expect(200);
      expect(o.body.totais.capacidade).toBe(40);
      const n = await api().get('/api/relatorios/novos-membros').set(auth(S.admin)).expect(200);
      expect(n.body.total).toBeGreaterThanOrEqual(5);
      expect(n.body.historicoDesde).toBeTruthy(); // Intermediário => 12 meses
      const g = await api().get('/api/relatorios/distribuicao-geografica').set(auth(S.admin)).expect(200);
      expect(g.body.linhas[0].celulaMaisProximaKm).toBe(0);
    });
    it('busca global', async () => {
      const r = await api().get('/api/busca?q=maria').set(auth(S.vol)).expect(200);
      expect(r.body.membros.map((m: any) => m.nomeCompleto)).toContain('Mariana Costa');
      expect((await api().get('/api/busca?q=m').set(auth(S.vol))).body.membros).toEqual([]);
      const lid = await api().get('/api/busca?q=Mariana').set(auth(S.lider1)).expect(200);
      expect(lid.body.membros).toHaveLength(1); // líder só vê a própria célula
    });
    it('outra igreja NÃO enxerga nem altera dados da primeira (RF05)', async () => {
      const r = await api().post('/api/igrejas').send({
        igreja: { nomeIgreja: 'Outra Igreja', cidade: 'Rio', estado: 'RJ', plano: 'PREMIUM' },
        administrador: { nome: 'Outro Admin', email: 'admin@outra.com', senha: 'senha-forte-2' },
      }).expect(201);
      S.admin2 = r.body.token;
      expect((await api().get('/api/membros').set(auth(S.admin2))).body).toEqual([]);
      await api().get(`/api/membros/${S.m1}`).set(auth(S.admin2)).expect(404);
      await api().get(`/api/celulas/${S.cel1}`).set(auth(S.admin2)).expect(404);
      await api().put(`/api/membros/${S.m1}`).set(auth(S.admin2)).send({ nomeCompleto: 'Hack', dataNascimento: '2000-01-01', genero: 'F', estadoCivil: 'SOLTEIRO', telefone: '11999999999', cep: '04010100', bairro: 'x' }).expect(404);
      await api().post(`/api/triagem/${S.m1}/alocacao`).set(auth(S.admin2)).send({ idCelula: S.cel1 }).expect(404);
      await api().patch(`/api/usuarios/${S.idVol}/status`).set(auth(S.admin2)).send({ ativo: false }).expect(404);
      expect((await api().get('/api/busca?q=Mariana').set(auth(S.admin2))).body.membros).toEqual([]);
    });
    it('LGPD: admin exclui membro definitivamente e a vaga é devolvida', async () => {
      const antes = (await prisma.celula.findUnique({ where: { id_celula: S.cel1 } })).capacidade_atual;
      await api().delete(`/api/membros/${S.perdedor}`).set(auth(S.admin)).expect(200);
      expect(await prisma.membro.count({ where: { id_membro: S.perdedor } })).toBe(0);
      expect((await prisma.celula.findUnique({ where: { id_celula: S.cel1 } })).capacidade_atual).toBe(antes - 1);
    });
  });

  // ------------------------------------------------------------------ assinatura / Mercado Pago
  describe('Assinatura e pagamento (Mercado Pago)', () => {
    const webhook = (tipo: string, id: string) =>
      api().post(`/api/pagamentos/webhook?data.id=${id}&type=${tipo}`).send({ type: tipo, action: 'updated', data: { id } });

    it('GET /assinatura: teste em andamento com uso e limites', async () => {
      const r = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(r.body.status).toBe('TESTE');
      expect(r.body.podeFazerCheckout).toBe(true);
      expect(r.body.limites.celulas).toBe(20);
      expect(r.body.uso.celulas).toBe(2);
    });
    it('somente ADMIN acessa /assinatura', async () => {
      await api().get('/api/assinatura').set(auth(S.vol)).expect(403);
    });
    it('checkout com cupom inválido => 400; cupom válido aplica o desconto no valor enviado ao MP', async () => {
      await api().post('/api/assinatura/checkout').set(auth(S.admin)).send({ plano: 'INTERMEDIARIO', cupom: 'NAOEXISTE' }).expect(400);
      await api().post('/api/plataforma/promocoes').send({ codigo: 'x', percDesconto: 10, dtainicio: '2026-01-01', dtaexpiracao: '2030-01-01' }).expect(401);
      await api().post('/api/plataforma/promocoes').set('x-plataforma-key', 'chave-plataforma-teste').send({ codigo: 'bemvindo20', percDesconto: 20, dtainicio: '2026-01-01T00:00:00Z', dtaexpiracao: '2030-01-01T00:00:00Z', maxUsos: 5 }).expect(201);
      const c = await api().get('/api/assinatura/cupom/bemvindo20').expect(200);
      expect(c.body).toMatchObject({ valido: true, percDesconto: 20 });
      const r = await api().post('/api/assinatura/checkout').set(auth(S.admin)).send({ plano: 'INTERMEDIARIO', cupom: 'BEMVINDO20', emailPagador: 'pagador@mp.com' }).expect(201);
      expect(r.body.initPoint).toMatch(/^https:\/\/mp\.test\/checkout\//);
      expect(r.body.valor).toBe(79.2); // 99 - 20%
      S.pre = r.body.idAssinaturaMp;
      expect(mp.assinaturas.get(S.pre).external_reference).toBe(`igreja:${S.idIgreja}|plano:INTERMEDIARIO|cupom:BEMVINDO20`);
    });
    it('antes de pagar continua em TESTE; webhook de preapproval autorizado => ATIVA com vencimento do MP', async () => {
      expect((await api().get('/api/assinatura').set(auth(S.admin))).body.status).toBe('TESTE');
      mp.autorizar(S.pre, dia(30));
      await webhook('subscription_preapproval', S.pre).expect(200);
      const r = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(r.body.status).toBe('ATIVA');
      expect(r.body.formaCobranca).toBe('MERCADO_PAGO');
      expect(r.body.valorCobrado).toBe(79.2);
      expect(r.body.cupom).toMatchObject({ codigo: 'BEMVINDO20', percDesconto: 20 });
      expect(r.body.podeFazerCheckout).toBe(false);
      expect(Math.round((new Date(r.body.vencimento).getTime() - Date.now()) / 86400000)).toBe(30);
      expect((await prisma.promocao.findUnique({ where: { codigo: 'BEMVINDO20' } })).total_usos).toBe(1);
      // idempotência: reenvio do mesmo webhook não duplica uso do cupom
      await webhook('subscription_preapproval', S.pre).expect(200);
      expect((await prisma.promocao.findUnique({ where: { codigo: 'BEMVINDO20' } })).total_usos).toBe(1);
      expect(await prisma.evento_Pagamento.count()).toBe(2);
    });
    it('cobrança aprovada cria Fatura PAGA (idempotente) e renova o período', async () => {
      mp.cobranca('ap_1', S.pre, 'aprovada');
      await webhook('subscription_authorized_payment', 'ap_1').expect(200);
      await webhook('subscription_authorized_payment', 'ap_1').expect(200);
      const r = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(r.body.faturas).toHaveLength(1);
      expect(r.body.faturas[0]).toMatchObject({ status: 'PAGA', valorPago: 79.2, valorTotal: 99 });
      expect(r.body.ultimoPagamento).toBeTruthy();
    });
    it('segundo checkout enquanto já é assinante => 409 JA_ASSINANTE', async () => {
      const r = await api().post('/api/assinatura/checkout').set(auth(S.admin)).send({ plano: 'PREMIUM' }).expect(409);
      expect(r.body.codigo).toBe('JA_ASSINANTE');
    });
    it('assinatura duplicada autorizada é cancelada no MP (evita cobrança em dobro)', async () => {
      const dup = await mp.criarAssinatura({ motivo: 'dup', referencia: `igreja:${S.idIgreja}|plano:PREMIUM`, emailPagador: 'x@x.com', valor: 179 });
      mp.autorizar(dup.id, dia(30));
      await webhook('subscription_preapproval', dup.id).expect(200);
      expect(mp.assinaturas.get(dup.id).status).toBe('cancelled');
      expect((await api().get('/api/assinatura').set(auth(S.admin))).body.status).toBe('ATIVA');
    });
    it('upgrade vale na hora e atualiza o valor no MP (cupom mantido)', async () => {
      const r = await api().post('/api/assinatura/plano').set(auth(S.admin)).send({ plano: 'PREMIUM' }).expect(200);
      expect(r.body.planoId).toBe('PREMIUM');
      expect(mp.assinaturas.get(S.pre).auto_recurring.transaction_amount).toBe(143.2); // 179 - 20%
    });
    it('downgrade é agendado; bloqueado se o uso não couber no plano menor', async () => {
      // uso: 4 usuários ativos > limite 3 do Essencial
      const x = await api().post('/api/assinatura/plano').set(auth(S.admin)).send({ plano: 'ESSENCIAL' }).expect(409);
      expect(x.body.codigo).toBe('USO_EXCEDE_PLANO');
      const r = await api().post('/api/assinatura/plano').set(auth(S.admin)).send({ plano: 'INTERMEDIARIO' }).expect(200);
      expect(r.body.planoId).toBe('PREMIUM');
      expect(r.body.planoPendente.idPlano).toBe('INTERMEDIARIO');
      expect(mp.assinaturas.get(S.pre).auto_recurring.transaction_amount).toBe(79.2);
    });
    it('próxima cobrança aprovada aplica o downgrade agendado', async () => {
      mp.autorizar(S.pre, dia(60));
      mp.cobranca('ap_2', S.pre, 'aprovada', dia(30));
      await webhook('subscription_authorized_payment', 'ap_2').expect(200);
      const r = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(r.body.planoId).toBe('INTERMEDIARIO');
      expect(r.body.planoPendente).toBeNull();
      expect(r.body.faturas).toHaveLength(2);
    });

    it('cobrança recusada => ATRASADA (ainda liberado, dentro da carência) + e-mail ao admin', async () => {
      const antes = mail.enviados.length;
      mp.cobranca('ap_3', S.pre, 'recusada', dia(60));
      await webhook('subscription_authorized_payment', 'ap_3').expect(200);
      const r = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(r.body.faturas.find((f: any) => f.status === 'RECUSADA').motivoRecusa).toBe('cc_rejected_insufficient_amount');
      expect(mail.enviados.length).toBeGreaterThan(antes);
      // vencimento ainda no futuro => segue ATIVA/ATRASADA e liberado
      expect(r.body.liberado).toBe(true);
    });

    // ---------------- bloqueio
    it('BLOQUEIO: vencimento + carência vencidos => somente leitura (GET ok, escrita 403 ASSINATURA_BLOQUEADA)', async () => {
      await prisma.assinatura.update({ where: { id_igreja: S.idIgreja }, data: { status: 'ATRASADA', dtavencimento: dia(-6) } });
      const a = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(a.body.liberado).toBe(false);
      expect(a.body.motivoBloqueio).toBe('PAGAMENTO_ATRASADO');
      await api().get('/api/membros').set(auth(S.vol)).expect(200); // leitura continua
      const r = await api().post('/api/membros').set(auth(S.vol)).send({ nomeCompleto: 'Bloqueado', dataNascimento: '2000-01-01', genero: 'F', estadoCivil: 'SOLTEIRO', telefone: '11999998888', cep: '04010100', bairro: 'x' }).expect(403);
      expect(r.body.codigo).toBe('ASSINATURA_BLOQUEADA');
      const t = await api().post(`/api/triagem/${S.homem}/matching`).set(auth(S.vol)).expect(403);
      expect(t.body.codigo).toBe('ASSINATURA_BLOQUEADA');
      // cobrança/regularização segue liberada
      await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
    });
    it('cron persiste a transição (EXPIRADA)', async () => {
      await assinaturaSvc.rodarCiclo();
      const a = await prisma.assinatura.findUnique({ where: { id_igreja: S.idIgreja } });
      expect(a.status).toBe('EXPIRADA');
    });
    it('pagamento aprovado depois do atraso destrava o sistema? (assinatura EXPIRADA exige novo checkout)', async () => {
      // a assinatura MP foi cancelada pelo MP após as falhas
      mp.assinaturas.get(S.pre).status = 'cancelled';
      await prisma.assinatura.update({ where: { id_igreja: S.idIgreja }, data: { status: 'CANCELADA', mp_status: 'cancelled' } });
      const co = await api().post('/api/assinatura/checkout').set(auth(S.admin)).send({ plano: 'INTERMEDIARIO' }).expect(201); // checkout liberado mesmo bloqueado
      mp.autorizar(co.body.idAssinaturaMp, dia(30));
      await webhook('subscription_preapproval', co.body.idAssinaturaMp).expect(200);
      const a = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(a.body.status).toBe('ATIVA');
      expect(a.body.liberado).toBe(true);
      await api().post(`/api/triagem/${S.homem}/matching`).set(auth(S.vol)).expect(200); // voltou a escrever
      S.pre2 = co.body.idAssinaturaMp;
    });
    it('cancelar: cancela no MP, mantém acesso até o fim do período pago, depois bloqueia', async () => {
      const r = await api().post('/api/assinatura/cancelar').set(auth(S.admin)).expect(200);
      expect(r.body.status).toBe('CANCELADA');
      expect(r.body.liberado).toBe(true);
      expect(mp.assinaturas.get(S.pre2).status).toBe('cancelled');
      await api().post('/api/assinatura/cancelar').set(auth(S.admin)).expect(409);
      await prisma.assinatura.update({ where: { id_igreja: S.idIgreja }, data: { dtavencimento: dia(-1) } });
      const a = await api().get('/api/assinatura').set(auth(S.admin)).expect(200);
      expect(a.body.motivoBloqueio).toBe('ASSINATURA_CANCELADA');
      expect(a.body.status).toBe('EXPIRADA');
    });
    it('teste gratuito vencido bloqueia (igreja nova) e sincronizar relê o MP', async () => {
      await prisma.assinatura.update({ where: { id_igreja: (await prisma.igreja.findFirst({ where: { nome_igreja: 'Outra Igreja' } })).id_igreja }, data: { dta_fim_teste: dia(-1) } });
      const r = await api().post('/api/celulas').set(auth(S.admin2)).send({}).expect(403);
      expect(r.body.codigo).toBe('ASSINATURA_BLOQUEADA');
      expect(r.body.message).toMatch(/teste gratuito terminou/);
      const s = await api().post('/api/assinatura/sincronizar').set(auth(S.admin2)).expect(200);
      expect(s.body.motivoBloqueio).toBe('TESTE_ENCERRADO');
    });
    it('webhook: tipo desconhecido e ping sem dados não quebram; webhooks de assinatura de outra igreja são ignorados', async () => {
      await api().post('/api/pagamentos/webhook').send({}).expect(200);
      await webhook('payment', '123').expect(200);
      const stray = await mp.criarAssinatura({ motivo: 'x', referencia: 'igreja:99999|plano:PREMIUM', emailPagador: 'a@a.com', valor: 1 });
      mp.autorizar(stray.id, dia(30));
      await webhook('subscription_preapproval', stray.id).expect(200);
    });
  });

  // ------------------------------------------------------------------ painel da plataforma
  describe('Plataforma', () => {
    it('lista igrejas com situação da assinatura (exige chave)', async () => {
      await api().get('/api/plataforma/igrejas').expect(401);
      const r = await api().get('/api/plataforma/igrejas').set('x-plataforma-key', 'chave-plataforma-teste').expect(200);
      expect(r.body).toHaveLength(2);
    });
  });
});
