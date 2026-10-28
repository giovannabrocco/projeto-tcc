import { IsString, IsNotEmpty, IsInt, IsDate } from 'class-validator';

export class CreatePromocaoDto {
  @IsInt({ message: 'O ID deve ser um número' })
  @IsNotEmpty({ message: 'O nome do membro não pode ser vazio' })
  id_assinatura: number;

  @IsDate({ message: 'Este campo é formato data' })
  @IsNotEmpty({ message: 'A data de início não pode ser vazia' })
  dtainicio: Date;

  @IsDate({ message: 'Este campo é formato data' })
  @IsNotEmpty({ message: 'A data de início não pode ser vazia' })
  dtaexpiracao: Date;

  @IsInt({ message: 'O percentual deve ser um número' })
  @IsNotEmpty({ message: 'O percentual não pode ser vazio' })
  perc_desconto: number;

  @IsString({ message: 'O indicador deve ser um texto' })
  @IsNotEmpty({ message: 'O indicador não pode ser vazio' })
  indpromocao: string;

  @IsString({ message: 'A descrição deve ser um texto' })
  @IsNotEmpty({ message: 'A descrição não pode ser vazio' })
  descricao: string;
}
