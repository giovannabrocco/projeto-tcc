import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { NotificacoesService } from './notificacoes.service';

class LidaDto {
  @IsBoolean()
  lida: boolean;
}

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.notificacoes.listar(u);
  }

  @Patch(':id')
  lida(@UsuarioAtual() u: UsuarioAutenticado, @Param('id') id: string, @Body() _dto: LidaDto) {
    return this.notificacoes.marcarLida(u, id);
  }
}
