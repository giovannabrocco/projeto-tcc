import { Injectable } from '@nestjs/common';
import { CreateFaturaDto } from './dto/create-fatura.dto';
import { UpdateFaturaDto } from './dto/update-fatura.dto';

@Injectable()
export class FaturaService {
  create(createFaturaDto: CreateFaturaDto) {
    return 'This action adds a new fatura';
  }

  findAll() {
    return `This action returns all fatura`;
  }

  findOne(id: number) {
    return `This action returns a #${id} fatura`;
  }

  update(id: number, updateFaturaDto: UpdateFaturaDto) {
    return `This action updates a #${id} fatura`;
  }

  remove(id: number) {
    return `This action removes a #${id} fatura`;
  }
}
