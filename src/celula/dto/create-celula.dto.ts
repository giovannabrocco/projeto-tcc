import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateCelulaDto {
  @IsString({ message: 'O nome do membro deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do membro não pode ser vazio' })
  nome_celula: string;

  @IsInt({ message: 'O ID deve ser uma número' })
  @IsNotEmpty({ message: 'O ID não pode ser vazio' })
  id_lider_celula: number;

  @IsInt({ message: 'O campo capacidade máxima deve ser uma número' })
  @IsNotEmpty({ message: 'O campo capacidade máxima não pode ser vazio' })
  capacidade_maxima: number;

  @IsString({ message: 'O campo hora deve ser uma string' })
  @IsNotEmpty({ message: 'O campo hora não pode ser vazio' })
  hora_celula: string;

  @IsString({ message: 'O campo dia de semana deve ser uma string' })
  @IsNotEmpty({ message: 'O campo dia de semana não pode ser vazio' })
  diaSemana: string;

  @IsString({ message: 'O campo perfil deve ser uma string' })
  @IsNotEmpty({ message: 'O campo perfil não pode ser vazio' })
  perfil_grupo: string;

  @IsInt({ message: 'O campo faixa mínima deve ser uma número' })
  @IsNotEmpty({ message: 'O campo faixa mínima não pode ser vazio' })
  faixa_etaria_min: number;

  @IsInt({ message: 'O campo faixa máxima deve ser uma número' })
  @IsNotEmpty({ message: 'O campo faixa máxima não pode ser vazio' })
  faixa_etaria_max: number;

  @IsString({ message: 'O cep deve ser uma string' })
  @IsNotEmpty({ message: 'O cep não pode ser vazio' })
  cep: string;
}
