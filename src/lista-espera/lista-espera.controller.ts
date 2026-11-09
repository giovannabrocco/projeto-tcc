import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { ListaEsperaService } from './lista-espera.service';

class AdicionarEsperaDto {
  @IsInt({ message: 'Informe o membro.' })
  idMembro: number;

  @IsOptional() @IsString() @MaxLength(300)
  motivo?: string;
}

@Controller('lista-espera')
@Perfis('VOLUNTARIO', 'ADMINISTRADOR')
export class ListaEsperaController {
  constructor(private readonly espera: ListaEsperaService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query('status') status?: string) {
    return this.espera.listar(u, status);
  }

  @Post()
  adicionar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: AdicionarEsperaDto) {
    return this.espera.adicionar(u, dto.idMembro, dto.motivo);
  }

  @Post(':id/tentativas')
  @HttpCode(200)
  tentativa(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.espera.registrarTentativa(u, id);
  }
}
