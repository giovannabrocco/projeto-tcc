import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePromocaoDto } from './dto/create-promocao.dto';
import { UpdatePromocaoDto } from './dto/update-promocao.dto';
import { PrismaService } from 'src/global/prisma.service';

@Injectable()
export class PromocaoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPromocaoDto: CreatePromocaoDto) {
    return await this.prisma.promocao.create({
      data: {
        id_assinatura: createPromocaoDto.id_assinatura,
        dtainicio: createPromocaoDto.dtainicio,
        dtaexpiracao: createPromocaoDto.dtaexpiracao,
        status: 'A',
        perc_desconto: createPromocaoDto.perc_desconto,
        indpromocao: createPromocaoDto.indpromocao,
        descricao: createPromocaoDto.descricao,
      },
    });
  }

  async findAll() {
    return await this.prisma.membro.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.promocao.findUnique({
      where: {
        id_promocao: id,
      },
    });
  }

  async update(id: number, data: UpdatePromocaoDto) {
    const promocao = await this.findUnique(id);

    if (!promocao) {
      throw new HttpException('Promoção não encontrada', HttpStatus.NOT_FOUND);
    }

    const record = await this.prisma.promocao.update({
      where: { id_promocao: id },
      data,
    });

    return record;
  }

  async delete(id: number) {
    const promocao = await this.findUnique(id);

    if (!promocao) {
      throw new HttpException('Promoção não encontrada', HttpStatus.NOT_FOUND);
    }

    return await this.prisma.promocao.delete({
      where: {
        id_promocao: id,
      },
    });
  }
}
