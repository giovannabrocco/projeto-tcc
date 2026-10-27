import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { IgrejaService } from './igreja.service';
import { CreateIgrejaDto } from './dto/create-igreja.dto';
import { UpdateIgrejaDto } from './dto/update-igreja.dto';

@Controller('igreja')
export class IgrejaController {
  constructor(private readonly igrejaService: IgrejaService) {}

  @Post()
  create(@Body() createIgrejaDto: CreateIgrejaDto) {
    return this.igrejaService.create(createIgrejaDto);
  }

  @Get()
  findAll() {
    return this.igrejaService.findAll();
  }

  @Get(':id')
  findUnique(@Param('id') id: string) {
    return this.igrejaService.findUnique(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIgrejaDto: UpdateIgrejaDto) {
    return this.igrejaService.update(+id, updateIgrejaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.igrejaService.delete(+id);
  }
}
