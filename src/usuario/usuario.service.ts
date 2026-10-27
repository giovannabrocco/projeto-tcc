import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PrismaService } from 'src/global/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const existeUsuario = await this.findByEmail(createUsuarioDto.email);

    if (existeUsuario) {
      throw new HttpException('Usuário já existe', HttpStatus.BAD_REQUEST);
    }

    createUsuarioDto.senha = await bcrypt.hash(createUsuarioDto.senha, 10);

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
    return await this.prisma.usuario.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.usuario.findUnique({
      where: {
        id_usuario: id,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.usuario.findUnique({
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        status: true,
        tipo_usuario: true,
      },
      where: {
        email: email,
      },
    });
  }

  async update(id: number, data: UpdateUsuarioDto) {
    const usuario = await this.findUnique(id);

    if (!usuario) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const record = await this.prisma.usuario.update({
      where: { id_usuario: id },
      data,
    });

    const { senha, ...usuarioAtualizado } = record;

    return usuarioAtualizado;
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
