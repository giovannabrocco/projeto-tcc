import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaturaService } from './fatura.service';
import { CreateFaturaDto } from './dto/create-fatura.dto';
import { UpdateFaturaDto } from './dto/update-fatura.dto';

@Controller('fatura')
export class FaturaController {
  constructor(private readonly faturaService: FaturaService) {}

  @Post()
  create(@Body() createFaturaDto: CreateFaturaDto) {
    return this.faturaService.create(createFaturaDto);
  }

  @Get()
  findAll() {
    return this.faturaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faturaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFaturaDto: UpdateFaturaDto) {
    return this.faturaService.update(+id, updateFaturaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faturaService.remove(+id);
  }
}
