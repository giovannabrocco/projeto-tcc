import { Module } from '@nestjs/common';
import { PromocaoService } from './promocao.service';
import { PromocaoController } from './promocao.controller';

@Module({
  controllers: [PromocaoController],
  providers: [PromocaoService],
})
export class PromocaoModule {}
