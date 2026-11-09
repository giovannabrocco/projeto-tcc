import { Module } from '@nestjs/common';
import { MembrosModule } from '../membros/membros.module';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbacksService } from './feedbacks.service';

@Module({ imports: [MembrosModule], controllers: [FeedbacksController], providers: [FeedbacksService] })
export class FeedbacksModule {}
