import { Module } from '@nestjs/common';
import { MembrosModule } from '../membros/membros.module';
import { MatchingService } from './matching.service';
import { TriagemController } from './triagem.controller';
import { TriagemService } from './triagem.service';

@Module({
  imports: [MembrosModule],
  controllers: [TriagemController],
  providers: [TriagemService, MatchingService],
  exports: [MatchingService],
})
export class TriagemModule {}
