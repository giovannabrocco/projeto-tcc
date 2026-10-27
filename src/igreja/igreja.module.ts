import { Module } from '@nestjs/common';
import { IgrejaService } from './igreja.service';
import { IgrejaController } from './igreja.controller';

@Module({
  controllers: [IgrejaController],
  providers: [IgrejaService],
})
export class IgrejaModule {}
