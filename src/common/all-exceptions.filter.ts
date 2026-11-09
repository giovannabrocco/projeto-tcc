import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Garante que TODO erro saia como { message, codigo?, campos? } (contrato do front-end). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erro');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') return res.status(status).json({ message: body });
      const b = body as Record<string, any>;
      const message = Array.isArray(b.message) ? b.message[0] : (b.message ?? exception.message);
      return res.status(status).json({
        message,
        ...(b.codigo ? { codigo: b.codigo } : {}),
        ...(b.campos ? { campos: b.campos } : {}),
      });
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return res.status(500).json({ message: 'Erro interno no servidor. Tente novamente.' });
  }
}
