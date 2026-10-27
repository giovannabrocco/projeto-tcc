import { Injectable } from '@nestjs/common';
import { CreatePromocaoDto } from './dto/create-promocao.dto';
import { UpdatePromocaoDto } from './dto/update-promocao.dto';

@Injectable()
export class PromocaoService {
  create(createPromocaoDto: CreatePromocaoDto) {
    return 'This action adds a new promocao';
  }

  findAll() {
    return `This action returns all promocao`;
  }

  findOne(id: number) {
    return `This action returns a #${id} promocao`;
  }

  update(id: number, updatePromocaoDto: UpdatePromocaoDto) {
    return `This action updates a #${id} promocao`;
  }

  remove(id: number) {
    return `This action removes a #${id} promocao`;
  }
}
