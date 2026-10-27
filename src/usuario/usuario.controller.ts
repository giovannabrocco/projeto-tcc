import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Get(':id')
  findUnique(@Param('id') id: string) {
    return this.usuarioService.findUnique(+id);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usuarioService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateUsuarioDto) {
    return this.usuarioService.update(+id, data); //TRATATIVA
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usuarioService.delete(+id);
  }
}
