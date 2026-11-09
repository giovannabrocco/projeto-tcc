import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({
    example: 'Nome do usuário',
  })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(50, { message: 'O nome deve ter no máximo 50 caracteres' })
  @IsNotEmpty({ message: 'O nome não pode ser vazio' })
  nome: string;

  @ApiProperty({
    example: 'Email do usuário',
  })
  @IsString({ message: 'O email deve ser uma string' })
  @MinLength(3, { message: 'O email deve ter no mínimo 3 caracteres' })
  @IsEmail({}, { message: 'O email deve ser um endereço de email válido' })
  @MaxLength(100, { message: 'O email deve ter no máximo 100 caracteres' })
  @IsNotEmpty({ message: 'O email não pode ser vazio' })
  email: string;

  @ApiProperty({
    example: 'Senha do usuário',
  })
  @IsString({ message: 'A senha deve ser uma string' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  @MaxLength(100, { message: 'A senha deve ter no máximo 100 caracteres' })
  @IsNotEmpty({ message: 'A senha não pode ser vazia' })
  senha: string;

  @IsString({ message: 'O tipo de usuário deve ser uma string' })
  @IsNotEmpty({ message: 'O tipo de usuário não pode ser vazio' })
  tipo_usuario: string;
}
