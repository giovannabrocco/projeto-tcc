import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PromocaoService } from './promocao.service';
import { CreatePromocaoDto } from './dto/create-promocao.dto';
import { UpdatePromocaoDto } from './dto/update-promocao.dto';

@Controller('promocao')
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
    return this.promocaoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePromocaoDto: UpdatePromocaoDto) {
    return this.promocaoService.update(+id, updatePromocaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promocaoService.remove(+id);
  }
}
