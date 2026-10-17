import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: '请先登录后再继续',
      });
    }

    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: '仅管理员可访问该功能',
      });
    }

    return true;
  }
}
