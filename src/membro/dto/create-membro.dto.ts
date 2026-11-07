import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDate,
  MinLength,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class CreateMembroDto {
  @IsString({ message: 'O nome do membro deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do membro não pode ser vazio' })
  nome_completo: string;

  @Type(() => Date)
  @IsDate({ message: 'Este campo é formato data' })
  data_nascimento: Date;

  @IsString({ message: 'O gênero deve ser uma string' })
  @IsNotEmpty({ message: 'O gênero não pode ser vazia' })
  genero: string;

  @IsString({ message: 'O email deve ser uma string' })
  @MinLength(3, { message: 'O email deve ter no mínimo 3 caracteres' })
  @IsEmail({}, { message: 'O email deve ser um endereço de email válido' })
  @MaxLength(100, { message: 'O email deve ter no máximo 100 caracteres' })
  @IsNotEmpty({ message: 'O email não pode ser vazio' })
  email: string;

  @IsString({ message: 'O estado civil deve ser uma string' })
  @IsNotEmpty({ message: 'O estado civil não pode ser vazia' })
  estado_civil: string;

  @IsString({ message: 'O CEP deve ser uma string' })
  @IsNotEmpty({ message: 'O CEP não pode ser vazia' })
  cep: string;

  @IsString({ message: 'O telefone deve ser uma string' })
  @IsNotEmpty({ message: 'O telefone não pode ser vazia' })
  telefone: string;

  @IsString({ message: 'A indicação deve ser em texto' })
  @IsNotEmpty({ message: 'A indicação não pode ser vazia' })
  indicado_por: string;

  observacoes: string;

  @IsInt({ message: 'O ID deve ser um número' })
  @IsNotEmpty({ message: 'O ID do usuário responsável não pode ser vazio' })
  id_usuario_triagem: number;

  @IsInt({ message: 'O ID deve ser um número' })
  @IsNotEmpty({ message: 'O ID da igreja não pode ser vazio' })
  id_igreja: number;

  id_celula_alocada: number;
}
