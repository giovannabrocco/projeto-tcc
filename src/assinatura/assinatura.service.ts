import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAssinaturaDto } from './dto/create-assinatura.dto';
import { UpdateAssinaturaDto } from './dto/update-assinatura.dto';
import { PrismaService } from 'src/global/prisma.service';

// verificar se vou precisar mesmo de todos os endpoints

@Injectable()
export class AssinaturaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssinaturaDto: CreateAssinaturaDto) {
    return await this.prisma.assinatura.create({
      data: {
        id_usuario: createAssinaturaDto.id_usuario,
        id_plano: createAssinaturaDto.id_plano,
        indpossuidesconto: createAssinaturaDto.indpossuidesconto,
        dtavencimento: createAssinaturaDto.dtavencimento,
      },
    });
  }

  async findAll() {
    return await this.prisma.assinatura.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.assinatura.findUnique({
      where: {
        id_assinatura: id,
      },
    });
  }

  async update(id: number, data: UpdateAssinaturaDto) {
    const assinatura = await this.findUnique(id);

    if (!assinatura) {
      throw new HttpException(
        'Assinatura não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    const record = await this.prisma.assinatura.update({
      where: { id_assinatura: id },
      data,
    });

    return record;
  }

  async delete(id: number) {
    const assinatura = await this.findUnique(id);

    if (!assinatura) {
      throw new HttpException(
        'Assinatura não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.prisma.assinatura.delete({
      where: {
        id_assinatura: id,
      },
    });
  }
}
