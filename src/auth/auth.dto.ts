import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  senha: string;
}

export class AlterarSenhaDto {
  @IsString() @IsNotEmpty({ message: 'Informe a senha atual.' })
  senhaAtual: string;

  @IsString() @MinLength(8, { message: 'Mínimo de 8 caracteres.' }) @MaxLength(100)
  novaSenha: string;
}

export class EsqueciSenhaDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;
}

export class RedefinirSenhaDto {
  @IsString() @IsNotEmpty({ message: 'Token obrigatório.' })
  token: string;

  @IsString() @MinLength(8, { message: 'Mínimo de 8 caracteres.' }) @MaxLength(100)
  novaSenha: string;
}
