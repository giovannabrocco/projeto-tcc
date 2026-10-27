import { PartialType } from '@nestjs/mapped-types';
import { CreateCelulaDto } from './create-celula.dto';

export class UpdateCelulaDto extends PartialType(CreateCelulaDto) {}
