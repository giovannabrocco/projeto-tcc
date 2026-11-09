import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { AtualizarUsuarioDto, CriarUsuarioDto, RedefinirSenhaUsuarioDto, StatusUsuarioDto } from './usuarios.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Perfis('ADMINISTRADOR')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() q: { perfil?: string; ativo?: string; q?: string }) {
    return this.usuarios.listar(u.idIgreja, q);
  }

  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(u, dto);
  }

  @Put(':id')
  atualizar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUsuarioDto) {
    return this.usuarios.atualizar(u, id, dto);
  }

  @Patch(':id/status')
  status(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: StatusUsuarioDto) {
    return this.usuarios.alterarStatus(u, id, dto.ativo, dto.confirmar);
  }

  @Post(':id/redefinir-senha')
  @HttpCode(200)
  redefinir(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body() dto: RedefinirSenhaUsuarioDto) {
    return this.usuarios.redefinirSenha(u, id, dto.senhaTemporaria);
  }
}

@Controller('lideres')
export class LideresController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query('q') q?: string) {
    return this.usuarios.lideres(u.idIgreja, q);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.usuarios.lider(u.idIgreja, id);
  }
}
