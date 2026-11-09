// Dados de demonstração: npm run db:seed  (idempotente: não duplica se a igreja demo já existir)
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/global/prisma.service';
import { PLANOS_PADRAO } from '../src/planos/planos.constants';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  for (const p of PLANOS_PADRAO) {
    await prisma.plano.upsert({ where: { id_plano: p.id_plano }, update: {}, create: p });
  }
  if (await prisma.usuario.findUnique({ where: { email: 'admin@demo.com' } })) {
    console.log('Seed já aplicado (admin@demo.com existe).');
    return prisma.$disconnect();
  }
  const senha = await bcrypt.hash('demo1234', 10);
  const fim = new Date(Date.now() + 14 * 86400000);
  const igreja = await prisma.igreja.create({
    data: {
      nome_igreja: 'Igreja Demo', denominacao: 'Batista', cidade: 'São Paulo', estado: 'SP',
      assinatura: { create: { id_plano: 'INTERMEDIARIO', status: 'TESTE', dta_inicio_teste: new Date(), dta_fim_teste: fim } },
    },
  });
  const mk = (nome: string, email: string, perfil: 'ADMINISTRADOR' | 'LIDER' | 'VOLUNTARIO') =>
    prisma.usuario.create({ data: { id_igreja: igreja.id_igreja, nome, email, senha, perfil } });
  await mk('Admin Demo', 'admin@demo.com', 'ADMINISTRADOR');
  await mk('Voluntária Demo', 'voluntario@demo.com', 'VOLUNTARIO');
  const l1 = await mk('Líder Vila Mariana', 'lider1@demo.com', 'LIDER');
  const l2 = await mk('Líder Pinheiros', 'lider2@demo.com', 'LIDER');
  const cel = (id_lider: number, nome: string, bairro: string, cep: string, lat: number, lng: number, perfil: string, min: number, max: number) =>
    prisma.celula.create({
      data: { id_igreja: igreja.id_igreja, id_lider, nome_celula: nome, capacidade_maxima: 15, hora_celula: '20:00', dia_semana: 'QUA',
        perfil_grupo: perfil, faixa_etaria_min: min, faixa_etaria_max: max, cep, bairro, cidade: 'São Paulo', latitude: lat, longitude: lng },
    });
  await cel(l1.id_usuario, 'Vila Mariana - Jovens', 'Vila Mariana', '04010100', -23.5893, -46.6346, 'JOVENS', 18, 28);
  await cel(l2.id_usuario, 'Pinheiros - Casais', 'Pinheiros', '05422000', -23.5662, -46.6918, 'CASAIS', 25, 45);
  const m = (nome: string, genero: string, ano: number, perfil: string) =>
    prisma.membro.create({
      data: { id_igreja: igreja.id_igreja, nome_completo: nome, genero, estado_civil: 'SOLTEIRO', data_nascimento: new Date(`${ano}-03-15`),
        telefone: '(11) 91234-5678', cep: '04010100', bairro_membro: 'Vila Mariana', cidade: 'São Paulo',
        latitude_membro: -23.59, longitude_membro: -46.635, perfil_interesse: perfil,
        disponibilidades: { create: [{ dia_semana: 'QUA', hora_inicio: '19:00', hora_fim: '22:00' }] } },
    });
  await m('Mariana Costa', 'F', 2002, 'JOVENS');
  await m('João Pereira', 'M', 2000, 'JOVENS');
  console.log('Seed ok. Logins (senha demo1234): admin@demo.com | voluntario@demo.com | lider1@demo.com | lider2@demo.com');
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
