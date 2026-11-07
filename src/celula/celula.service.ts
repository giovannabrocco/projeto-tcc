import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCelulaDto } from './dto/create-celula.dto';
import { PrismaService } from 'src/global/prisma.service';
import axios from 'axios';
import { BrasilApiCepResponse } from './interface/apicep.interface';

@Injectable()
export class CelulaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCelulaDto: CreateCelulaDto) {
    const existeCelula = await this.prisma.celula.findUnique({
      where: { id_lider_celula: createCelulaDto.id_lider_celula },
    });

    if (existeCelula) {
      throw new HttpException(
        'Já existe uma célula com este líder',
        HttpStatus.BAD_REQUEST,
      );
    }

    const liderDto = await this.prisma.membro.findUnique({
      where: { id_membro: createCelulaDto.id_lider_celula },
    });

    if (!liderDto) {
      throw new HttpException(
        'O membro líder informado não existe',
        HttpStatus.BAD_REQUEST,
      );
    }

    const igrejaLider = await this.prisma.igreja.findUnique({
      where: { id_igreja: liderDto.id_igreja },
    });

    if (!igrejaLider) {
      throw new HttpException(
        'O lider não está vinculado a nenhuma célula',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data } = await axios.get<BrasilApiCepResponse>(
      `https://brasilapi.com.br/api/cep/v2/${createCelulaDto.cep}`,
    );

    const latiLong = await this.buscaLatLongPorCep(createCelulaDto.cep);

    return await this.prisma.celula.create({
      data: {
        nome_celula: createCelulaDto.nome_celula,
        id_lider_celula: createCelulaDto.id_lider_celula,
        capacidade_maxima: createCelulaDto.capacidade_maxima,
        capacidade_atual: 0,
        hora_celula: createCelulaDto.hora_celula,
        status: 'A',
        diaSemana: createCelulaDto.diaSemana,
        perfil_grupo: createCelulaDto.perfil_grupo,
        faixa_etaria_min: createCelulaDto.faixa_etaria_min,
        faixa_etaria_max: createCelulaDto.faixa_etaria_max,
        cep: createCelulaDto.cep,
        bairro: data.neighborhood,
        latitude: Number(latiLong.latitude),
        longitude: Number(latiLong.longitude),
        id_igreja: igrejaLider.id_igreja,
      },
    });
  }

  async findAll() {
    return await this.prisma.celula.findMany();
  }

  async findUnique(id: number) {
    return await this.prisma.celula.findUnique({
      where: {
        id_celula: id,
      },
    });
  }

  private async buscaLatLongPorCep(cep: string) {
    const { data } = await axios.get<BrasilApiCepResponse>(
      `https://brasilapi.com.br/api/cep/v2/${cep}`,
    );

    return {
      latitude: data.location.coordinates.latitude,
      longitude: data.location.coordinates.longitude,
    };
  }
}
