import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, IsBoolean } from 'class-validator';

const PERFIS = ['ADMINISTRADOR', 'LIDER', 'VOLUNTARIO'];

export class CriarUsuarioDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome.' }) @MinLength(3, { message: 'Mínimo de 3 caracteres.' }) @MaxLength(80)
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' }) @MaxLength(100)
  email: string;

  @IsIn(PERFIS, { message: 'Perfil inválido.' })
  perfil: 'ADMINISTRADOR' | 'LIDER' | 'VOLUNTARIO';

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;

  @IsString() @MinLength(8, { message: 'Mínimo de 8 caracteres.' }) @MaxLength(100)
  senhaTemporaria: string;
}

export class AtualizarUsuarioDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome.' }) @MinLength(3, { message: 'Mínimo de 3 caracteres.' }) @MaxLength(80)
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' }) @MaxLength(100)
  email: string;

  @IsIn(PERFIS, { message: 'Perfil inválido.' })
  perfil: 'ADMINISTRADOR' | 'LIDER' | 'VOLUNTARIO';

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;
}

export class StatusUsuarioDto {
  @IsBoolean({ message: 'Informe ativo true/false.' })
  ativo: boolean;

  @IsOptional() @IsBoolean()
  confirmar?: boolean;
}

export class RedefinirSenhaUsuarioDto {
  @IsString() @MinLength(8, { message: 'Mínimo de 8 caracteres.' }) @MaxLength(100)
  senhaTemporaria: string;
}
