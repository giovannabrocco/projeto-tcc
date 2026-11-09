import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { SalvarCelulaDto, StatusCelulaDto } from './celulas.dto';
import { CelulasService } from './celulas.service';

@Controller('celulas')
export class CelulasController {
  constructor(private readonly celulas: CelulasService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() q: Record<string, string>) {
    return this.celulas.listar(u, q);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.celulas.obter(u.idIgreja, id);
  }

  @Post()
  @Perfis('ADMINISTRADOR')
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SalvarCelulaDto) {
    return this.celulas.criar(u, dto);
  }

  @Put(':id')
  @Perfis('ADMINISTRADOR')
  atualizar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: SalvarCelulaDto) {
    return this.celulas.atualizar(u, id, dto);
  }

  @Patch(':id/status')
  @Perfis('ADMINISTRADOR')
  status(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: StatusCelulaDto) {
    return this.celulas.alterarStatus(u, id, dto.ativa, dto.confirmar);
  }
}
