import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { DIAS_SEMANA, ESTADOS_CIVIS, PERFIS_GRUPO } from '../common/util';

export class DisponibilidadeDto {
  @IsIn(DIAS_SEMANA as unknown as string[], { message: 'Dia da semana inválido.' })
  diaSemana: string;

  @IsOptional() @Matches(/^(([01]\d|2[0-3]):[0-5]\d)?$/, { message: 'Horário no formato HH:MM.' })
  horarioInicio?: string;

  @IsOptional() @Matches(/^(([01]\d|2[0-3]):[0-5]\d)?$/, { message: 'Horário no formato HH:MM.' })
  horarioFim?: string;
}

/** Usado em POST e PUT /membros */
export class SalvarMembroDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome completo.' }) @MinLength(3, { message: 'Mínimo de 3 caracteres.' }) @MaxLength(120)
  nomeCompleto: string;

  @IsDateString({}, { message: 'Data de nascimento inválida (AAAA-MM-DD).' })
  dataNascimento: string;

  @IsIn(['F', 'M'], { message: 'Gênero inválido.' })
  genero: string;

  @IsIn(ESTADOS_CIVIS as unknown as string[], { message: 'Estado civil inválido.' })
  estadoCivil: string;

  @IsString() @IsNotEmpty({ message: 'Informe o telefone.' }) @MaxLength(25)
  telefone: string;

  @IsOptional() @IsEmail({}, { message: 'E-mail inválido.' }) @MaxLength(100)
  email?: string;

  @IsString() @IsNotEmpty({ message: 'Informe o CEP.' })
  cep: string;

  @IsString() @IsNotEmpty({ message: 'Informe o bairro.' }) @MaxLength(80)
  bairro: string;

  @IsOptional() @IsString() @MaxLength(80)
  cidade?: string;

  @IsOptional() @IsIn([...PERFIS_GRUPO, ''], { message: 'Perfil de interesse inválido.' })
  perfilInteresse?: string;

  @IsOptional() @IsInt()
  indicadoPor?: number;

  @IsOptional() @IsString() @MaxLength(1000)
  observacoes?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(21) @ValidateNested({ each: true }) @Type(() => DisponibilidadeDto)
  disponibilidades?: DisponibilidadeDto[];

  /** consentimento LGPD do visitante */
  @IsOptional() @IsBoolean()
  consentimentoLgpd?: boolean;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;
}

export class SaidaMembroDto {
  @IsString({ message: 'Informe o motivo da saída.' }) @IsNotEmpty({ message: 'Informe o motivo da saída.' }) @MaxLength(300)
  motivo: string;

  @IsOptional() @IsBoolean()
  reencaminhar?: boolean;
}

export class DesvincularDto {
  @IsOptional() @IsString() @MaxLength(300)
  motivo?: string;
}
