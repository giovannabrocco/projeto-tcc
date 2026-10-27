import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MembroService } from './membro.service';
import { CreateMembroDto } from './dto/create-membro.dto';
import { UpdateMembroDto } from './dto/update-membro.dto';

@Controller('membro')
export class MembroController {
  constructor(private readonly membroService: MembroService) {}

  @Post()
  create(@Body() createMembroDto: CreateMembroDto) {
    return this.membroService.create(createMembroDto);
  }

  @Get()
  findAll() {
    return this.membroService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membroService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMembroDto: UpdateMembroDto) {
    return this.membroService.update(+id, updateMembroDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.membroService.remove(+id);
  }
}
