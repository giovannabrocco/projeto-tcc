import {
  Celula, Disponibilidade_Membro, Feedback, Historico_Celulas, Log_Triagem, Membro, Usuario,
} from '../../generated/prisma/client';
import { calcularIdade, formatarCep, isoData } from './util';

type UsuarioComCelulas = Usuario & { celulasLideradas?: Celula[] };
type CelulaComLider = Celula & { lider?: Usuario | null };
type MembroCompleto = Membro & { disponibilidades?: Disponibilidade_Membro[]; celula?: Celula | null };

export const INCLUDE_USUARIO = { celulasLideradas: { where: { ativa: true } } } as const;
export const INCLUDE_CELULA = { lider: true } as const;
export const INCLUDE_MEMBRO = { disponibilidades: true, celula: true } as const;

export const mapUsuario = (u: UsuarioComCelulas) => {
  const cel = u.celulasLideradas?.find((c) => c.ativa) ?? null;
  return {
    idUsuario: u.id_usuario,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    perfil: u.perfil,
    ativo: u.ativo,
    senhaTemporaria: u.senha_temporaria,
    dataCriacao: u.dtahora_criado.toISOString(),
    idIgreja: u.id_igreja,
    idCelula: cel?.id_celula ?? null,
    nomeCelula: cel?.nome_celula ?? null,
  };
};

export const resumoCelula = (c: Celula | null | undefined) =>
  c ? { idCelula: c.id_celula, nomeCelula: c.nome_celula, bairro: c.bairro, perfilGrupo: c.perfil_grupo } : null;

export const mapCelula = (c: CelulaComLider) => {
  const vagas = Math.max(0, c.capacidade_maxima - c.capacidade_atual);
  return {
    idCelula: c.id_celula,
    nomeCelula: c.nome_celula,
    idLider: c.id_lider,
    lider: c.lider
      ? { idUsuario: c.lider.id_usuario, nome: c.lider.nome, telefone: c.lider.telefone, email: c.lider.email }
      : null,
    capacidadeMaxima: c.capacidade_maxima,
    capacidadeAtual: c.capacidade_atual,
    vagas,
    lotada: vagas === 0,
    ocupacaoPct: c.capacidade_maxima ? Math.round((c.capacidade_atual / c.capacidade_maxima) * 100) : 0,
    statusCelula: c.ativa ? 'ATIVA' : 'INATIVA',
    ativa: c.ativa,
    diaSemana: c.dia_semana,
    horario: c.hora_celula,
    perfilGrupo: c.perfil_grupo,
    faixaEtaria: `${c.faixa_etaria_min}-${c.faixa_etaria_max}`,
    cep: formatarCep(c.cep),
    bairro: c.bairro,
    cidade: c.cidade,
    endereco: c.endereco,
    descricao: c.descricao,
    latitude: c.latitude,
    longitude: c.longitude,
    idIgreja: c.id_igreja,
  };
};

export const mapMembro = (m: MembroCompleto) => ({
  idMembro: m.id_membro,
  nomeCompleto: m.nome_completo,
  dataNascimento: isoData(m.data_nascimento),
  idade: calcularIdade(m.data_nascimento),
  genero: m.genero,
  estadoCivil: m.estado_civil,
  telefone: m.telefone,
  email: m.email ?? '',
  cep: formatarCep(m.cep),
  bairro: m.bairro_membro,
  cidade: m.cidade,
  latitude: m.latitude_membro,
  longitude: m.longitude_membro,
  perfilInteresse: m.perfil_interesse,
  indicadoPor: m.indicado_por,
  observacoes: m.observacoes,
  consentimentoLgpd: m.indlgpd,
  disponibilidades: (m.disponibilidades ?? []).map((d) => ({
    diaSemana: d.dia_semana,
    horarioInicio: d.hora_inicio,
    horarioFim: d.hora_fim,
  })),
  statusMembro: m.status_membro,
  idCelulaAlocada: m.id_celula_alocada,
  celula: resumoCelula(m.celula),
  idUsuarioTriagem: m.id_usuario_triagem,
  dataCadastro: m.dtahora_cadastro.toISOString(),
  idIgreja: m.id_igreja,
});

export const mapLog = (l: Log_Triagem & { Celula?: Celula | null }) => ({
  idLog: l.id_log,
  idMembro: l.id_membro,
  idVoluntario: l.id_voluntario,
  idCelulaSugerida: l.id_celula_sugerida,
  nomeCelula: l.Celula?.nome_celula ?? null,
  scoreMatching: l.score_matching,
  criteriosScore: l.criterios_score,
  statusTriagem: l.status_triagem,
  idRespDecisao: l.id_resp_decisao,
  motivoRejeicao: l.motivo_rejeicao,
  dataHora: l.dtahora_triagem.toISOString(),
});

export const mapFeedback = (f: Feedback) => ({
  idFeedback: f.id_feedback,
  idMembro: f.id_membro,
  idLogTriagem: f.id_log_triagem,
  statusAdaptacao: f.status_adaptacao,
  notaIntegracao: f.nota_integracao,
  permaneceuNaCelula: f.permaneceu_na_celula,
  dataVisita: isoData(f.dta_visita),
  dataProximoContato: isoData(f.dta_proximo_contato),
  comentariosMembro: f.comentarios_membro,
  avaliacaoLider: f.avaliacao_lider,
  dataCriacao: f.dtahora_criado.toISOString(),
});

export const mapHistorico = (h: Historico_Celulas & { Celula?: Celula | null }) => ({
  idHistorico: h.id_historico,
  idMembro: h.id_membro,
  idCelula: h.id_celula,
  nomeCelula: h.Celula?.nome_celula ?? '—',
  dataEntrada: isoData(h.dta_entrada),
  dataSaida: isoData(h.dta_saida),
  motivoSaida: h.motivo_saida,
});
