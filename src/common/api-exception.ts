import { HttpException } from '@nestjs/common';

/** Erro no formato do contrato: { message, codigo?, campos? } */
export class ApiException extends HttpException {
  constructor(
    status: number,
    message: string,
    extra: { codigo?: string; campos?: Record<string, string> } = {},
  ) {
    super({ message, ...extra }, status);
  }
}

export const falhar = (
  status: number,
  message: string,
  extra?: { codigo?: string; campos?: Record<string, string> },
): never => {
  throw new ApiException(status, message, extra);
};
