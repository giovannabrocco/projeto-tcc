import { IsNotEmpty, IsInt, IsDate } from 'class-validator';

export class CreateAssinaturaDto {
  @IsInt({ message: 'O ID deve ser um número' })
  @IsNotEmpty({ message: 'O ID não pode ser vazio' })
  id_usuario: number;

  @IsInt({ message: 'O ID deve ser um número' })
  @IsNotEmpty({ message: 'O ID não pode ser vazio' })
  id_plano: number;

  @IsNotEmpty({ message: 'O indicador não pode ser vazio' })
  indpossuidesconto: boolean;

  @IsDate({ message: 'Este campo é formato data' })
  @IsNotEmpty({ message: 'A data de vencimento não pode ser vazia' })
  dtavencimento: Date;
}
