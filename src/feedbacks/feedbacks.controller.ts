import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { CriarFeedbackDto } from './feedbacks.dto';
import { FeedbacksService } from './feedbacks.service';

@Controller('feedbacks')
export class FeedbacksController {
  constructor(private readonly feedbacks: FeedbacksService) {}

  @Get('acompanhamento')
  @Perfis('LIDER', 'ADMINISTRADOR')
  acompanhamento(@UsuarioAtual() u: UsuarioAutenticado, @Query('idCelula') idCelula?: string) {
    return this.feedbacks.acompanhamento(u, idCelula ? Number(idCelula) : undefined);
  }

  @Get()
  @Perfis('LIDER', 'ADMINISTRADOR')
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query('idMembro') idMembro?: string) {
    return this.feedbacks.listar(u, idMembro ? Number(idMembro) : undefined);
  }

  @Post()
  @Perfis('LIDER')
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CriarFeedbackDto) {
    return this.feedbacks.criar(u, dto);
  }
}
