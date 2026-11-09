import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class DadosIgrejaDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome da igreja.' }) @MaxLength(120)
  nomeIgreja: string;

  @IsOptional() @IsString() @MaxLength(80)
  denominacao?: string;

  @IsString() @IsNotEmpty({ message: 'Informe a cidade.' }) @MaxLength(80)
  cidade: string;

  @IsString() @Length(2, 2, { message: 'Use a sigla do estado (ex.: SP).' })
  estado: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;

  @IsString({ message: 'Escolha um plano.' }) @IsNotEmpty({ message: 'Escolha um plano.' })
  plano: string;
}

export class DadosAdminDto {
  @IsString() @IsNotEmpty({ message: 'Informe seu nome.' }) @MinLength(3, { message: 'Mínimo de 3 caracteres.' }) @MaxLength(80)
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' }) @MaxLength(100)
  email: string;

  @IsString() @MinLength(8, { message: 'Mínimo de 8 caracteres.' }) @MaxLength(100)
  senha: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;
}

/** POST /igrejas — onboarding SaaS (tela "Quero ser assinante") */
export class CriarIgrejaDto {
  @ValidateNested() @Type(() => DadosIgrejaDto)
  igreja: DadosIgrejaDto;

  @ValidateNested() @Type(() => DadosAdminDto)
  administrador: DadosAdminDto;
}

/** PUT /igrejas/atual */
export class AtualizarIgrejaDto {
  @IsString() @IsNotEmpty({ message: 'Informe o nome da igreja.' }) @MaxLength(120)
  nomeIgreja: string;

  @IsOptional() @IsString() @MaxLength(80)
  denominacao?: string;

  @IsString() @IsNotEmpty({ message: 'Informe a cidade.' }) @MaxLength(80)
  cidade: string;

  @IsString() @Length(2, 2, { message: 'Use a sigla do estado (ex.: SP).' })
  estado: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefone?: string;

  /** Troca de plano (mesma regra de POST /assinatura/plano) */
  @IsOptional() @IsString()
  plano?: string;
}
