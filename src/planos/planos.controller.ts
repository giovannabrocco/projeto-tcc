import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PlanosService } from './planos.service';

@Controller('planos')
export class PlanosController {
  constructor(private readonly planos: PlanosService) {}

  /** Pública: alimenta a tela inicial (seção "Planos") e o formulário de cadastro. */
  @Public()
  @Get()
  listar() {
    return this.planos.listarAtivos();
  }
}
