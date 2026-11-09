import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { DIAS_SEMANA, PERFIS_GRUPO } from '../common/util';

/** Usado em POST e PUT /celulas */
export class SalvarCelulaDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome da célula.' }) @MaxLength(100)
  nomeCelula: string;

  @IsInt({ message: 'Selecione o líder.' })
  idLider: number;

  @IsInt({ message: 'Informe a capacidade.' }) @Min(1, { message: 'Mínimo 1.' }) @Max(1000)
  capacidadeMaxima: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário no formato HH:MM.' })
  horario: string;

  @IsIn(DIAS_SEMANA as unknown as string[], { message: 'Dia da semana inválido.' })
  diaSemana: string;

  @IsIn(PERFIS_GRUPO as unknown as string[], { message: 'Perfil do grupo inválido.' })
  perfilGrupo: string;

  /** "18-28" */
  @Matches(/^\d{1,3}-\d{1,3}$/, { message: 'Use o formato 18-28.' })
  faixaEtaria: string;

  @IsString() @IsNotEmpty({ message: 'Informe o CEP.' })
  cep: string;

  @IsString() @IsNotEmpty({ message: 'Informe o bairro.' }) @MaxLength(80)
  bairro: string;

  @IsOptional() @IsString() @MaxLength(80)
  cidade?: string;

  @IsOptional() @IsString() @MaxLength(200)
  endereco?: string;

  @IsOptional() @IsString() @MaxLength(500)
  descricao?: string;

  /** opcionais: permitem informar a posição manualmente quando o CEP não é geocodificado */
  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;
}

export class StatusCelulaDto {
  @IsBoolean({ message: 'Informe ativa true/false.' })
  ativa: boolean;

  @IsOptional() @IsBoolean()
  confirmar?: boolean;
}
