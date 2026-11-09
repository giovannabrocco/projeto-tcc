import { Module } from '@nestjs/common';
import { AssinaturaController, PagamentosController } from './assinatura.controller';
import { AssinaturaService } from './assinatura.service';
import { MercadoPagoService } from './mercadopago.service';

@Module({
  controllers: [AssinaturaController, PagamentosController],
  providers: [AssinaturaService, MercadoPagoService],
  exports: [AssinaturaService, MercadoPagoService],
})
export class AssinaturaModule {}
