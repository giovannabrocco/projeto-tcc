import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PromocaoService } from './promocao.service';
import { CreatePromocaoDto } from './dto/create-promocao.dto';
import { UpdatePromocaoDto } from './dto/update-promocao.dto';

@Controller('membro')
export class PromocaoController {
  constructor(private readonly promocaoService: PromocaoService) {}

  @Post()
  create(@Body() createPromocaoDto: CreatePromocaoDto) {
    return this.promocaoService.create(createPromocaoDto);
  }

  @Get()
  findAll() {
    return this.promocaoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promocaoService.findUnique(+id);
  }

  @Patch(':id')
  update(@Param('id') id, @Body() updatePromocaoDto: UpdatePromocaoDto) {
    return this.promocaoService.update(+id, updatePromocaoDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.promocaoService.delete(+id);
  }
}
