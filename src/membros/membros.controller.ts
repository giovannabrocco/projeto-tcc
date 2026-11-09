import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { DesvincularDto, SalvarMembroDto, SaidaMembroDto } from './membros.dto';
import { MembrosService } from './membros.service';

@Controller('membros')
export class MembrosController {
  constructor(private readonly membros: MembrosService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() q: Record<string, string>) {
    return this.membros.listar(u, q);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.membros.obter(u, id);
  }

  @Post()
  @Perfis('VOLUNTARIO', 'ADMINISTRADOR')
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SalvarMembroDto) {
    return this.membros.criar(u, dto);
  }

  @Put(':id')
  @Perfis('ADMINISTRADOR')
  atualizar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: SalvarMembroDto) {
    return this.membros.atualizar(u, id, dto);
  }

  @Post(':id/saida')
  @HttpCode(200)
  @Perfis('LIDER', 'ADMINISTRADOR')
  saida(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: SaidaMembroDto) {
    return this.membros.registrarSaida(u, id, dto.motivo, !!dto.reencaminhar);
  }

  @Post(':id/desvincular')
  @HttpCode(200)
  @Perfis('ADMINISTRADOR')
  desvincular(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: DesvincularDto) {
    return this.membros.registrarSaida(u, id, dto.motivo || 'Desvinculado pelo administrador', true);
  }

  @Delete(':id')
  @Perfis('ADMINISTRADOR')
  excluir(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.membros.excluir(u, id);
  }
}
