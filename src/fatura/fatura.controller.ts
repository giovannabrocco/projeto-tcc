import { Controller } from '@nestjs/common';
import { FaturaService } from './fatura.service';

@Controller('fatura')
export class FaturaController {
  constructor(private readonly faturaService: FaturaService) {}
}
