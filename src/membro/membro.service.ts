import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMembroDto } from './dto/create-membro.dto';
import { UpdateMembroDto } from './dto/update-membro.dto';
import { PrismaService } from 'src/global/prisma.service';
import axios from 'axios';
import { BrasilApiCepResponse } from 'src/celula/interface/apicep.interface';

@Injectable()
export class MembroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMembroDto: CreateMembroDto) {
    const existeMembro = await this.findByEmail(createMembroDto.email);

    if (existeMembro) {
      throw new HttpException('Usuário já existe', HttpStatus.BAD_REQUEST);
    }

    const { data } = await axios.get<BrasilApiCepResponse>(
      `https://brasilapi.com.br/api/cep/v2/${createMembroDto.cep}`,
    );

    if (!data) {
      throw new HttpException('CEP não existe', HttpStatus.BAD_REQUEST);
    }

    // indicado_por: true, mudar nome para um mais claro, mas ele faz referencia do id_membro
    return await this.prisma.membro.create({
      data: {
        nome_completo: createMembroDto.nome_completo,
        data_nascimento: createMembroDto.data_nascimento,
        genero: createMembroDto.genero,
        email: createMembroDto.email,
        bairro_membro: data.neighborhood,
        latitude_membro: data.location.coordinates.latitude,
        longitude_membro: data.location.coordinates.longitude,
        indicado_por: createMembroDto.indicado_por,
        observacoes: createMembroDto.observacoes,
        status: 'A',
        estado_civil: createMembroDto.estado_civil,
        cep: createMembroDto.cep,
        telefone: createMembroDto.telefone,
        id_usuario_triagem: createMembroDto.id_usuario_triagem,
        id_igreja: createMembroDto.id_igreja,
        id_celula_alocada: createMembroDto.id_celula_alocada,
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

  async findByEmail(email: string) {
    return await this.prisma.membro.findUnique({
      select: {
        id_membro: true,
        nome_completo: true,
        data_nascimento: true,
        genero: true,
        estado_civil: true,
        indicado_por: true, // mudar nome para um mais claro, mas ele faz referencia do id_membro
        cep: true,
        telefone: true,
        id_usuario_triagem: true,
        id_igreja: true,
        id_celula_alocada: true,
      },
      where: {
        email: email,
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
