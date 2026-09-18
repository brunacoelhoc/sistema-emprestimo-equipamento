import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// Rotulo em portugues pra cada status HTTP que a API usa
const ROTULOS_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisicao invalida',
  [HttpStatus.UNAUTHORIZED]: 'Nao autenticado',
  [HttpStatus.FORBIDDEN]: 'Sem permissao',
  [HttpStatus.NOT_FOUND]: 'Nao encontrado',
  [HttpStatus.CONFLICT]: 'Conflito',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas requisicoes',
};

// Padroniza toda resposta de erro da API num formato unico e em portugues,
// independente de quem lancou a excecao (ValidationPipe, guard, service,
// ou algo inesperado tipo erro de conexao com o banco).
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // erro previsto (lancado por nos, por um guard ou pelo ValidationPipe)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const corpo = exception.getResponse();
      const mensagem =
        status === HttpStatus.TOO_MANY_REQUESTS
          ? 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.'
          : typeof corpo === 'string'
            ? corpo
            : ((corpo as { message?: string | string[] }).message ??
              'Erro inesperado.');

      response.status(status).json({
        statusCode: status,
        erro: ROTULOS_STATUS[status] ?? 'Erro',
        mensagem,
        caminho: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // erro nao previsto (bug, falha de conexao, etc) - nao expoe detalhes internos
    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      erro: 'Erro interno',
      mensagem: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
      caminho: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
