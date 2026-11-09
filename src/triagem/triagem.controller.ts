import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { AlocacaoDto, RejeicaoDto } from './triagem.dto';
import { TriagemService } from './triagem.service';

@Controller('triagem')
export class TriagemController {
  constructor(private readonly triagem: TriagemService) {}

  @Get('pendentes')
  @Perfis('VOLUNTARIO', 'ADMINISTRADOR')
  pendentes(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.triagem.pendentes(u);
  }

  @Post(':id/matching')
  @HttpCode(200)
  @Perfis('VOLUNTARIO', 'ADMINISTRADOR')
  matching(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.triagem.executarMatching(u, id);
  }

  @Post(':id/alocacao')
  @HttpCode(200)
  @Perfis('VOLUNTARIO', 'ADMINISTRADOR')
  alocacao(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: AlocacaoDto) {
    return this.triagem.alocar(u, id, dto);
  }

  @Post(':id/rejeicao')
  @HttpCode(200)
  @Perfis('VOLUNTARIO', 'ADMINISTRADOR')
  rejeicao(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: RejeicaoDto) {
    return this.triagem.rejeitar(u, id, dto);
  }

  @Get(':id/logs')
  logs(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.triagem.logs(u, id);
  }
}
