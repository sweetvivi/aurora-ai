import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractBearerToken(request);

    if (!accessToken) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: '请先登录后再继续',
      });
    }

    const claims = this.tokenService.verifyAccessToken(accessToken);
    const user = await this.prismaService.user.findUnique({
      where: { id: claims.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: '登录用户不存在',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: '当前账号已停用',
      });
    }

    request.user = this.tokenService.toAuthenticatedUser(user);

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.header('authorization');

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');

    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
