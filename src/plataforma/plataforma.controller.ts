import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Public } from '../common/decorators';
import { PrismaService } from '../global/prisma.service';
import { falhar } from '../common/api-exception';
import { PlataformaGuard } from './plataforma.guard';
import { resumoAcesso } from '../assinatura/situacao';

class CriarPromocaoDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{3,30}$/, { message: '3 a 30 caracteres (letras, números, - e _).' })
  codigo: string;

  @IsOptional() @IsString() @MaxLength(200)
  descricao?: string;

  @IsNumber() @Min(1) @Max(100)
  percDesconto: number;

  @IsDateString()
  dtainicio: string;

  @IsDateString()
  dtaexpiracao: string;

  @IsOptional() @IsInt() @Min(1)
  maxUsos?: number;
}

class AtualizarPromocaoDto {
  @IsOptional() @IsBoolean()
  ativo?: boolean;

  @IsOptional() @IsDateString()
  dtaexpiracao?: string;

  @IsOptional() @IsInt() @Min(1)
  maxUsos?: number;
}

/** Operação interna do dono da plataforma (não é usada pelo front das igrejas). */
@Public()
@UseGuards(PlataformaGuard)
@Controller('plataforma')
export class PlataformaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('igrejas')
  async igrejas() {
    const lista = await this.prisma.igreja.findMany({ include: { assinatura: true, _count: { select: { membros: true, celulas: true, usuarios: true } } }, orderBy: { id_igreja: 'asc' } });
    return lista.map((i) => ({
      idIgreja: i.id_igreja,
      nomeIgreja: i.nome_igreja,
      cidade: i.cidade,
      estado: i.estado,
      ativo: i.ativo,
      assinatura: i.assinatura ? resumoAcesso(i.assinatura) : null,
      uso: i._count,
    }));
  }

  @Get('promocoes')
  promocoes() {
    return this.prisma.promocao.findMany({ orderBy: { id_promocao: 'desc' } });
  }

  @Post('promocoes')
  async criarPromocao(@Body() dto: CriarPromocaoDto) {
    const codigo = dto.codigo.trim().toUpperCase();
    if (await this.prisma.promocao.findUnique({ where: { codigo } })) falhar(409, 'Já existe um cupom com este código.');
    return this.prisma.promocao.create({
      data: {
        codigo,
        descricao: dto.descricao ?? '',
        perc_desconto: dto.percDesconto,
        dtainicio: new Date(dto.dtainicio),
        dtaexpiracao: new Date(dto.dtaexpiracao),
        max_usos: dto.maxUsos ?? null,
      },
    });
  }

  @Patch('promocoes/:id')
  atualizarPromocao(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarPromocaoDto) {
    return this.prisma.promocao.update({
      where: { id_promocao: id },
      data: {
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        ...(dto.dtaexpiracao ? { dtaexpiracao: new Date(dto.dtaexpiracao) } : {}),
        ...(dto.maxUsos !== undefined ? { max_usos: dto.maxUsos } : {}),
      },
    });
  }
}
