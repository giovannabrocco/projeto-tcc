import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AssinaturaService } from './assinatura.service';
import { CreateAssinaturaDto } from './dto/create-assinatura.dto';
import { UpdateAssinaturaDto } from './dto/update-assinatura.dto';

@Controller('assinatura')
export class AssinaturaController {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  @Post()
  create(@Body() createAssinaturaDto: CreateAssinaturaDto) {
    return this.assinaturaService.create(createAssinaturaDto);
  }

  @Get()
  findAll() {
    return this.assinaturaService.findAll();
  }

  @Get(':id')
  findUnique(@Param('id') id: string) {
    return this.assinaturaService.findUnique(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssinaturaDto: UpdateAssinaturaDto,
  ) {
    return this.assinaturaService.update(+id, updateAssinaturaDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.assinaturaService.delete(+id);
  }
}
