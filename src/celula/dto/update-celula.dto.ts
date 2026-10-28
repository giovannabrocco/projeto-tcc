import { PartialType } from '@nestjs/mapped-types';
import { CreateCelulaDto } from './create-celula.dto';

export class UpdateCelulaDto extends PartialType(CreateCelulaDto) {
  nome_celula: string;
  id_lider_celula: number;
  capacidade_maxima: number;
  hora_celula: string;
  diaSemana: string;
  perfil_grupo: string;
  faixa_etaria_min: number;
  faixa_etaria_max: number;
  cep: string;
  bairro: string;
}
