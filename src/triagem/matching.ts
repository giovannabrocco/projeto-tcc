/**
 * Algoritmo de matching (RF01) — lógica pura, sem banco, para ser testável (Jest).
 * Mantém os mesmos pesos/regras do protótipo do front (src/services/mock/matching.js).
 *
 * Escore = Σ (peso_i × pontuação_i), pontuação_i ∈ [0,1], convertido para 0–100.
 *   distância 40% (Haversine) · faixa etária 25% · disponibilidade 20% · perfil do grupo 15%
 * Regras eliminatórias: célula inativa, lotada (RC06) ou perfil incompatível (ex.: célula feminina
 * para membro masculino). Desempate: mais vagas, depois menor distância.
 */
import { calcularIdade } from '../common/util';

export const PESOS = { distancia: 0.4, idade: 0.25, disponibilidade: 0.2, perfil: 0.15 } as const;
export const RAIO_MAXIMO_KM = 12;
export const SCORE_MINIMO = 65;
const RAIO_TERRA_KM = 6371;

export interface DisponibilidadeMatch { diaSemana: string; horarioInicio?: string; horarioFim?: string }
export interface MembroMatch {
  dataNascimento: Date | string | null;
  genero: string;
  estadoCivil: string;
  perfilInteresse?: string;
  latitude: number | null;
  longitude: number | null;
  disponibilidades?: DisponibilidadeMatch[];
}
export interface CelulaMatch {
  idCelula: number;
  ativa: boolean;
  capacidadeMaxima: number;
  capacidadeAtual: number;
  perfilGrupo: string;
  faixaEtaria: string; // "18-28"
  diaSemana: string;
  horario: string; // HH:MM
  latitude: number;
  longitude: number;
}
export interface CriterioScore { pontuacao: number; peso: number; [extra: string]: unknown }
export interface ResultadoMatching {
  idCelula: number;
  score: number;
  vagas: number;
  criterios: {
    distancia: CriterioScore & { km: number | null };
    idade: CriterioScore & { idade: number | null };
    disponibilidade: CriterioScore;
    perfil: CriterioScore;
  };
}

const rad = (g: number) => (g * Math.PI) / 180;

/** Fórmula de Haversine — distância em km entre dois pontos (graus). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
}

export const parseFaixa = (faixa = '') => {
  const [min, max] = String(faixa).split('-').map(Number);
  return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 120 };
};

export function pontuarDistancia(km: number) {
  if (km <= 1) return 1;
  if (km >= RAIO_MAXIMO_KM) return 0;
  return 1 - (km - 1) / (RAIO_MAXIMO_KM - 1);
}

export function pontuarIdade(idade: number | null, faixa: string) {
  if (idade === null || idade === undefined) return 0.5;
  const { min, max } = parseFaixa(faixa);
  if (idade >= min && idade <= max) return 1;
  const fora = idade < min ? min - idade : idade - max;
  return Math.max(0, 1 - fora * 0.15);
}

export function pontuarDisponibilidade(disp: DisponibilidadeMatch[] = [], diaSemana: string, horario: string) {
  if (!disp.length) return 0.5; // não informou: neutro
  const mesmoDia = disp.filter((d) => d.diaSemana === diaSemana);
  if (!mesmoDia.length) return 0;
  const cabe = mesmoDia.some(
    (d) => (!d.horarioInicio || d.horarioInicio <= horario) && (!d.horarioFim || horario <= d.horarioFim),
  );
  return cabe ? 1 : 0.5;
}

/** null = incompatível de forma eliminatória. */
export function pontuarPerfil(m: MembroMatch, idade: number | null, perfilGrupo: string): number | null {
  const interesse = m.perfilInteresse === perfilGrupo ? 1 : null;
  switch (perfilGrupo) {
    case 'MULHERES': return m.genero === 'F' ? 1 : null;
    case 'HOMENS': return m.genero === 'M' ? 1 : null;
    case 'CASAIS': return m.estadoCivil === 'CASADO' ? 1 : 0.15;
    case 'FAMILIAS': return interesse ?? (m.estadoCivil === 'CASADO' ? 0.9 : 0.4);
    case 'JOVENS':
      return interesse ?? (idade !== null && idade <= 30 && m.estadoCivil !== 'CASADO' ? 0.9 : 0.4);
    case 'UNIVERSITARIOS':
      return interesse ?? (idade !== null && idade >= 17 && idade <= 26 ? 0.8 : 0.3);
    case 'NOVOS_CONVERTIDOS': return interesse ?? 0.5;
    default: return interesse ?? 0.7;
  }
}

export function calcularMatching(
  membro: MembroMatch,
  celulas: CelulaMatch[],
  { limite = 3, hoje = new Date() }: { limite?: number; hoje?: Date } = {},
): ResultadoMatching[] {
  const idade = calcularIdade(membro.dataNascimento, hoje);
  const resultados: ResultadoMatching[] = [];

  for (const c of celulas) {
    const vagas = c.capacidadeMaxima - c.capacidadeAtual;
    if (!c.ativa || vagas <= 0) continue;
    const perfil = pontuarPerfil(membro, idade, c.perfilGrupo);
    if (perfil === null) continue;

    // sem coordenadas do membro não há como medir distância: pontua 0 (e não elimina a célula)
    const temCoord = membro.latitude !== null && membro.longitude !== null &&
      membro.latitude !== undefined && membro.longitude !== undefined;
    const km = temCoord ? haversine(membro.latitude!, membro.longitude!, c.latitude, c.longitude) : null;

    const criterios = {
      distancia: { pontuacao: km === null ? 0 : pontuarDistancia(km), peso: PESOS.distancia, km: km === null ? null : Number(km.toFixed(2)) },
      idade: { pontuacao: pontuarIdade(idade, c.faixaEtaria), peso: PESOS.idade, idade },
      disponibilidade: { pontuacao: pontuarDisponibilidade(membro.disponibilidades, c.diaSemana, c.horario), peso: PESOS.disponibilidade },
      perfil: { pontuacao: perfil, peso: PESOS.perfil },
    };
    const score = Object.values(criterios).reduce((s, x) => s + x.pontuacao * x.peso, 0);
    resultados.push({ idCelula: c.idCelula, score: Math.round(score * 100), vagas, criterios });
  }

  resultados.sort(
    (a, b) =>
      b.score - a.score ||
      b.vagas - a.vagas ||
      (a.criterios.distancia.km ?? Infinity) - (b.criterios.distancia.km ?? Infinity),
  );
  return resultados.slice(0, limite);
}
