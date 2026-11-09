import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsString({ message: 'Plano inválido.' }) @IsNotEmpty({ message: 'Escolha um plano.' })
  plano: string;

  @IsOptional() @IsString() @MaxLength(40)
  cupom?: string;

  /** e-mail da conta Mercado Pago que vai pagar (padrão: e-mail do administrador) */
  @IsOptional() @IsEmail({}, { message: 'E-mail inválido.' })
  emailPagador?: string;
}

export class TrocarPlanoDto {
  @IsString({ message: 'Plano inválido.' }) @IsNotEmpty({ message: 'Escolha um plano.' })
  plano: string;
}
