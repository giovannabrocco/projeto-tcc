import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Perfis, Public, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { AtualizarIgrejaDto, CriarIgrejaDto } from './igrejas.dto';
import { IgrejasService } from './igrejas.service';

@Controller('igrejas')
export class IgrejasController {
  constructor(private readonly igrejas: IgrejasService) {}

  @Get('atual')
  atual(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.igrejas.atual(u.idIgreja);
  }

  @Put('atual')
  @Perfis('ADMINISTRADOR')
  atualizar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: AtualizarIgrejaDto) {
    return this.igrejas.atualizar(u, dto);
  }

  // pública (tela "Quero ser assinante"); limite por IP contra cadastros em massa
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post()
  criar(@Body() dto: CriarIgrejaDto) {
    return this.igrejas.criar(dto);
  }
}
