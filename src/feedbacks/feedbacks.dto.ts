import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CriarFeedbackDto {
  @IsInt({ message: 'Informe o membro.' })
  idMembro: number;

  @IsIn(['RESPONDEU', 'NAO_RESPONDEU', 'PARTICIPANDO'], { message: 'Status de adaptação inválido.' })
  statusAdaptacao: string;

  @IsOptional() @IsInt({ message: 'A nota deve ser de 1 a 5.' }) @Min(1, { message: '1 a 5.' }) @Max(5, { message: '1 a 5.' })
  notaIntegracao?: number;

  @IsOptional() @IsBoolean()
  permaneceuNaCelula?: boolean;

  @IsOptional() @IsDateString({}, { message: 'Data inválida.' })
  dataVisita?: string;

  @IsOptional() @IsDateString({}, { message: 'Data inválida.' })
  dataProximoContato?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  comentariosMembro?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  avaliacaoLider?: string;
}
