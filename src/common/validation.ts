import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiException } from './api-exception';

function coletar(erros: ValidationError[], prefixo = '', saida: Record<string, string> = {}) {
  for (const e of erros) {
    const caminho = prefixo ? `${prefixo}.${e.property}` : e.property;
    if (e.constraints) saida[caminho] = Object.values(e.constraints)[0];
    if (e.children?.length) coletar(e.children, caminho, saida);
  }
  return saida;
}

/** ValidationPipe que responde 400 com { message, campos: { campo: "erro" } }. */
export const criarValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (erros) => {
      const campos = coletar(erros);
      return new ApiException(400, 'Preencha os campos obrigatórios corretamente.', { campos });
    },
  });
