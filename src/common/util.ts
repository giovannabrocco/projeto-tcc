/** Remove acentos e caixa para buscas ("São Paulo" == "sao paulo"). */
export const normalizar = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const somenteDigitos = (s = '') => s.replace(/\D/g, '');

export const formatarCep = (cep: string) => {
  const d = somenteDigitos(cep);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
};

export function calcularIdade(nascimento: Date | string | null, hoje = new Date()): number | null {
  if (!nascimento) return null;
  const n = new Date(nascimento);
  if (Number.isNaN(n.getTime())) return null;
  let idade = hoje.getUTCFullYear() - n.getUTCFullYear();
  const antes =
    hoje.getUTCMonth() < n.getUTCMonth() ||
    (hoje.getUTCMonth() === n.getUTCMonth() && hoje.getUTCDate() < n.getUTCDate());
  if (antes) idade -= 1;
  return idade;
}

export const isoData = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export const addDias = (d: Date, dias: number) => new Date(d.getTime() + dias * 86400000);

export const addMeses = (d: Date, meses: number) => {
  const r = new Date(d);
  const dia = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(dia, ultimo));
  return r;
};

export const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;
export const PERFIS_GRUPO = [
  'JOVENS', 'UNIVERSITARIOS', 'CASAIS', 'MULHERES', 'HOMENS', 'NOVOS_CONVERTIDOS', 'FAMILIAS', 'MISTO',
] as const;
export const ESTADOS_CIVIS = ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO'] as const;
