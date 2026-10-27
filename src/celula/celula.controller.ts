import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CelulaService } from './celula.service';
import { CreateCelulaDto } from './dto/create-celula.dto';

@Controller('celula')
export class CelulaController {
  constructor(private readonly celulaService: CelulaService) {}

  @Post()
  create(@Body() createCelulaDto: CreateCelulaDto) {
    return this.celulaService.create(createCelulaDto);
  }

  @Get()
  findAll() {
    return this.celulaService.findAll();
  }

  @Get(':id')
  findUnique(@Param('id') id: string) {
    return this.celulaService.findUnique(+id);
  }
}
