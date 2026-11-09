import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AlocacaoDto {
  @IsInt({ message: 'Selecione a célula.' })
  idCelula: number;

  @IsOptional() @IsIn(['AUTOMATICA', 'MANUAL'], { message: 'Modo inválido.' })
  modo?: 'AUTOMATICA' | 'MANUAL';

  @IsOptional() @IsInt()
  idLog?: number;
}

export class RejeicaoDto {
  @IsInt({ message: 'Informe a sugestão.' })
  idLog: number;

  @IsOptional() @IsString() @MaxLength(300)
  motivo?: string;
}
