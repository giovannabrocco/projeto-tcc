import { PartialType } from '@nestjs/mapped-types';
import { CreatePromocaoDto } from './create-promocao.dto';

export class UpdatePromocaoDto extends PartialType(CreatePromocaoDto) {}
