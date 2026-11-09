/** Planos do Conectus (TCC, seção 3.x). `null` = ilimitado. São gravados em tb_plano na subida da API. */
export const PLANOS_PADRAO = [
  {
    id_plano: 'ESSENCIAL',
    nome: 'Essencial',
    descricao: 'Para igrejas de pequeno porte: até 100 membros, 5 células e 3 usuários.',
    valor: 49,
    limite_membros: 100,
    limite_celulas: 5,
    limite_usuarios: 3,
    historico_meses: 6,
  },
  {
    id_plano: 'INTERMEDIARIO',
    nome: 'Intermediário',
    descricao: 'Para igrejas em crescimento: até 500 membros, 20 células e 10 usuários.',
    valor: 99,
    limite_membros: 500,
    limite_celulas: 20,
    limite_usuarios: 10,
    historico_meses: 12,
  },
  {
    id_plano: 'PREMIUM',
    nome: 'Premium',
    descricao: 'Para grandes instituições: cadastros ilimitados e histórico completo.',
    valor: 179,
    limite_membros: null,
    limite_celulas: null,
    limite_usuarios: null,
    historico_meses: null,
  },
];

export type Recurso = 'membros' | 'celulas' | 'usuarios';
