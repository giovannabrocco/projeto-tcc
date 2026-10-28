import { PartialType } from '@nestjs/mapped-types';
import { CreateIgrejaDto } from './create-igreja.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateIgrejaDto extends PartialType(CreateIgrejaDto) {
  @IsString({ message: 'O nome da igreja deve ser uma string' })
  @IsNotEmpty({ message: 'O nome da igreja não pode ser vazio' })
  nome_igreja: string;

  @IsString({ message: 'A denominação deve ser uma string' })
  @IsNotEmpty({ message: 'A denominação não pode ser vazia' })
  denominacao: string;

  @IsString({ message: 'A cidade deve ser uma string' })
  @IsNotEmpty({ message: 'A cidade não pode ser vazia' })
  cidade: string;

  @IsString({ message: 'O estado deve ser uma string' })
  @IsNotEmpty({ message: 'O estado não pode ser vazio' })
  estado: string;

  @IsString({ message: 'O endereço deve ser uma string' })
  @IsNotEmpty({ message: 'O endereço não pode ser vazio' })
  telefone: string;

  @IsNotEmpty({ message: 'O ID da central não pode ser vazio' })
  id_central: number;
}
