import { PartialType } from '@nestjs/mapped-types';
import { CreateIgrejaDto } from './create-igreja.dto';

export class UpdateIgrejaDto extends PartialType(CreateIgrejaDto) {}
