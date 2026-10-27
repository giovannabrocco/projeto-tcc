import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateIgrejaDto } from './dto/create-igreja.dto';
import { UpdateIgrejaDto } from './dto/update-igreja.dto';
import { PrismaService } from 'src/global/prisma.service';

@Injectable()
export class IgrejaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createIgrejaDto: CreateIgrejaDto) {
    const existeCentral = await this.prisma.igreja.findUnique({
      where: { id_igreja: createIgrejaDto.id_central },
    });

    if (!existeCentral) {
      throw new HttpException(
        'O id de igreja central passado não existe',
        HttpStatus.BAD_REQUEST,
      );
    }

    // adicionar coluna endereço, id_usuario_responsavel na tabela igreja
    return await this.prisma.igreja.create({
      data: {
        nome_igreja: createIgrejaDto.nome_igreja,
        denominacao: createIgrejaDto.denominacao,
        cidade: createIgrejaDto.cidade,
        estado: createIgrejaDto.estado,
        telefone: createIgrejaDto.telefone,
        id_central: createIgrejaDto.id_central,
        status: 'A',
      },
    });
  }

  async findAll() {
    return await this.prisma.igreja.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.igreja.findUnique({
      where: {
        id_igreja: id,
      },
    });
  }

  // Terá update automático, quando plano ultrapassar a validade e alteração manual
  async update(id: number, data: UpdateIgrejaDto) {
    const igreja = await this.findUnique(id);

    if (!igreja) {
      throw new HttpException('Igreja não encontrada', HttpStatus.NOT_FOUND);
    }

    const record = await this.prisma.igreja.update({
      where: { id_igreja: id },
      data,
    });

    return record;
  }

  // verificar como que será feito procedimento de exclusão da igreja
  async delete(id: number) {
    const igreja = await this.findUnique(id);

    if (!igreja) {
      throw new HttpException('Igreja não encontrada', HttpStatus.NOT_FOUND);
    }

    return await this.prisma.igreja.delete({
      where: {
        id_igreja: id,
      },
    });
  }
}
