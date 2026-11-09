import type { Request } from 'express';
import { Perfil } from '../../generated/prisma/client';

/** Usuário autenticado, carregado do banco a cada requisição (token + situação atual). */
export interface UsuarioAutenticado {
  idUsuario: number;
  nome: string;
  email: string;
  perfil: Perfil;
  idIgreja: number;
}

export type RequisicaoAutenticada = Request & { usuario?: UsuarioAutenticado };
