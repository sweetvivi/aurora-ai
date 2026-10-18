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
    const status = this.resolveStatus(exception);

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
    if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
      return {
        code: 'FILE_TOO_LARGE',
        message: '文件超过允许的大小限制',
      };
    }

    const uploadErrorCode = this.uploadErrorCode(exception);

    if (uploadErrorCode) {
      return {
        code: uploadErrorCode.code,
        message: uploadErrorCode.message,
      };
    }

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

  private resolveStatus(exception: unknown): number {
    if (this.httpExceptionErrorCode(exception) === 'FILE_TOO_LARGE') {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (this.uploadErrorCode(exception)?.code === 'FILE_TOO_LARGE') {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    if (this.uploadErrorCode(exception)) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private httpExceptionErrorCode(exception: unknown): string | null {
    if (!(exception instanceof HttpException)) {
      return null;
    }

    const response = exception.getResponse();

    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response &&
      typeof (response as { code?: unknown }).code === 'string'
    ) {
      return (response as { code: string }).code;
    }

    return null;
  }

  private uploadErrorCode(exception: unknown): { code: string; message: string } | null {
    if (
      typeof exception !== 'object' ||
      exception === null ||
      !('code' in exception) ||
      typeof (exception as { code?: unknown }).code !== 'string'
    ) {
      return null;
    }

    const code = (exception as { code: string }).code;

    if (code === 'LIMIT_FILE_SIZE') {
      return {
        code: 'FILE_TOO_LARGE',
        message: '文件超过允许的大小限制',
      };
    }

    if (code.startsWith('LIMIT_')) {
      return {
        code: 'FILE_UPLOAD_INVALID',
        message: '文件上传参数不符合要求',
      };
    }

    return null;
  }
}
