import { PartialType } from '@nestjs/mapped-types';
import { CreateAssinaturaDto } from './create-assinatura.dto';

export class UpdateAssinaturaDto extends PartialType(CreateAssinaturaDto) {}
