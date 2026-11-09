import { Controller, Get, Query } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('resumo')
  resumo(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.relatorios.resumo(u);
  }

  @Get('novos-membros')
  @Perfis('ADMINISTRADOR')
  novosMembros(@UsuarioAtual() u: UsuarioAutenticado, @Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.novosMembros(u, de, ate);
  }

  @Get('ocupacao')
  @Perfis('ADMINISTRADOR')
  ocupacao(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.relatorios.ocupacao(u);
  }

  @Get('distribuicao-geografica')
  @Perfis('ADMINISTRADOR')
  distribuicao(@UsuarioAtual() u: UsuarioAutenticado, @Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.distribuicaoGeografica(u, de, ate);
  }
}
