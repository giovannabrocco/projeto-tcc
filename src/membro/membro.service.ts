import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMembroDto } from './dto/create-membro.dto';
import { UpdateMembroDto } from './dto/update-membro.dto';
import { PrismaService } from 'src/global/prisma.service';

@Injectable()
export class MembroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateMembroDto) {
    const existeUsuario = await this.findByNome(CreateMembroDto.nome_completo);

    if (existeUsuario) {
      throw new HttpException('Usuário já existe', HttpStatus.BAD_REQUEST);
    }

    return await this.prisma.usuario.create({
      data: {
        nome: createUsuarioDto.nome,
        email: createUsuarioDto.email,
        senha: createUsuarioDto.senha,
        status: 'A',
        tipo_usuario: 'U',
      },
    });
  }

  async findAll() {
    return await this.prisma.membro.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.membro.findUnique({
      where: {
        id_membro: id,
      },
    });
  }

  async findByNome(nome: string) {
    return await this.prisma.membro.findUnique({
      select: {
        id_membro: true,
        nome_completo: true,
        status: true,
      },
      where: {
        nome_completo: nome,
      },
    });
  }

  async update(id: number, data: UpdateMembroDto) {
    const usuario = await this.findUnique(id);

    if (!usuario) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const record = await this.prisma.usuario.update({
      where: { id_usuario: id },
      data,
    });

    return record;
  }

  async delete(id: number) {
    const usuario = await this.findUnique(id);

    if (!usuario) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    return await this.prisma.usuario.delete({
      where: {
        id_usuario: id,
      },
    });
  }
}
