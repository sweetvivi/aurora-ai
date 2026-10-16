import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  code: string;
  details?: unknown;
  message: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      error: this.toErrorPayload(exception, status),
      requestId: request.requestId ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  private toErrorPayload(exception: unknown, status: number): ErrorPayload {
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        code: this.statusCode(status),
        message: response,
      };
    }

    if (typeof response === 'object' && response !== null) {
      const payload = response as Record<string, unknown>;
      const rawMessage = payload.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('; ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : exception.message;

      return {
        code: typeof payload.code === 'string' ? payload.code : this.statusCode(status),
        details: payload.details,
        message,
      };
    }

    return {
      code: this.statusCode(status),
      message: exception.message,
    };
  }

  private statusCode(status: number): string {
    return HttpStatus[status] ?? `HTTP_${status}`;
  }
}
