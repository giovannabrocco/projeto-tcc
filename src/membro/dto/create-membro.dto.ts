import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMembroDto {
  @IsString({ message: 'O nome do membro deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do membro não pode ser vazio' })
  nome_completo: string;

  @IsNotEmpty({ message: 'A data de nascimento não pode ser vazia' })
  data_nascimento: Date;

  @IsString({ message: 'O gênero deve ser uma string' })
  @IsNotEmpty({ message: 'O gênero não pode ser vazia' })
  genero: string;

  @IsString({ message: 'O estado civil deve ser uma string' })
  @IsNotEmpty({ message: 'O estado civil não pode ser vazia' })
  estado_civil: string;

  @IsString({ message: 'A indicação deve ser uma string' })
  @IsNotEmpty({ message: 'A indicação não pode ser vazia' })
  indicado_por: string;

  @IsNotEmpty({ message: 'O CEP não pode ser vazia' })
  cep: number;

  @IsNotEmpty({ message: 'O telefone não pode ser vazia' })
  telefone: number;

  // criar coluna no banco estado e cidade

  @IsString({ message: 'O bairro deve ser uma string' })
  @IsNotEmpty({ message: 'O bairro não pode ser vazia' })
  bairro_membro: string;

  @IsNotEmpty({ message: 'O ID do usuário responsável não pode ser vazio' })
  id_usuario_triagem: number;

  @IsNotEmpty({ message: 'O ID da igreja não pode ser vazio' })
  id_igreja: number;

  @IsNotEmpty({ message: 'O ID da célula não pode ser vazio' })
  id_celula_alocada: number;
}
