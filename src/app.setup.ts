import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { criarValidationPipe } from './common/validation';
import { env } from './config/env';

/** Configuração HTTP compartilhada entre main.ts e os testes e2e. */
export function configurarApp(app: INestApplication) {
  app.setGlobalPrefix('api'); // o proxy do Vite encaminha /api/* (VITE_API_URL=/api)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // front em outro domínio
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  if (env.trustProxy) (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);
  app.useGlobalPipes(criarValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
