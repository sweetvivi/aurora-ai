import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const MAX_REQUEST_ID_LENGTH = 128;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingRequestId = request.header('x-request-id')?.trim();
    const requestId = incomingRequestId
      ? incomingRequestId.slice(0, MAX_REQUEST_ID_LENGTH)
      : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
