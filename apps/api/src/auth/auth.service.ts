import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, User } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { AuthTokens, AuthenticatedUser } from './auth.types';
import type { DevLoginDto } from './dto/dev-login.dto';
import type { EmailLoginDto } from './dto/email-login.dto';
import type { EmailRegisterDto } from './dto/email-register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export interface AuthResult extends AuthTokens {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async devLogin(input: DevLoginDto, request: Request): Promise<AuthResult> {
    if (
      !this.configService.get<boolean>('AUTH_DEV_LOGIN_ENABLED', true) ||
      this.configService.get<string>('NODE_ENV') === 'production'
    ) {
      throw new ForbiddenException({
        code: 'DEV_LOGIN_DISABLED',
        message: '开发登录已关闭',
      });
    }

    const email = input.email?.trim().toLowerCase() ?? 'dev@aurora.local';
    const displayName = input.displayName?.trim() || '演示用户';
    const existing = await this.prismaService.user.findUnique({ where: { email } });
    const user = existing ?? (await this.createUser({ displayName, email }));

    return this.issueAuthResult(user, request);
  }

  async register(input: EmailRegisterDto, request: Request): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prismaService.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: '该邮箱已注册',
      });
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.createUser({
      displayName: input.displayName.trim(),
      email,
      passwordHash,
    });

    return this.issueAuthResult(user, request);
  }

  async emailLogin(input: EmailLoginDto, request: Request): Promise<AuthResult> {
    const user = await this.prismaService.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });

    if (
      !user?.passwordHash ||
      !(await this.passwordService.verify(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码不正确',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: '当前账号已停用',
      });
    }

    return this.issueAuthResult(user, request);
  }

  async refresh(refreshToken: string, request: Request): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const session = await this.prismaService.refreshSession.findUnique({
      include: { user: true },
      where: { tokenHash },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: '刷新令牌无效或已过期，请重新登录',
      });
    }

    if (session.user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: '当前账号已停用',
      });
    }

    const rotated = this.tokenService.createRefreshToken();

    await this.prismaService.$transaction(async (transaction) => {
      const revocation = await transaction.refreshSession.updateMany({
        data: {
          lastUsedAt: new Date(),
          revokedAt: new Date(),
        },
        where: {
          id: session.id,
          revokedAt: null,
        },
      });

      if (revocation.count !== 1) {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: '刷新令牌无效或已过期，请重新登录',
        });
      }

      await transaction.refreshSession.create({
        data: {
          expiresAt: rotated.expiresAt,
          ipAddress: request.ip,
          tokenHash: rotated.tokenHash,
          userAgent: request.header('user-agent'),
          userId: session.userId,
        },
      });
    });

    return {
      accessToken: this.tokenService.signAccessToken(session.user),
      expiresIn: this.tokenService.accessTokenExpiresIn,
      refreshToken: rotated.token,
      user: this.tokenService.toAuthenticatedUser(session.user),
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    const where = refreshToken
      ? {
          revokedAt: null,
          tokenHash: this.tokenService.hashRefreshToken(refreshToken),
          userId,
        }
      : {
          revokedAt: null,
          userId,
        };

    await this.prismaService.refreshSession.updateMany({
      data: { revokedAt: new Date() },
      where,
    });
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: '登录用户不存在',
      });
    }

    return this.tokenService.toAuthenticatedUser(user);
  }

  private async createUser(input: Prisma.UserCreateInput): Promise<User> {
    const initialPoints = this.configService.get<number>('INITIAL_POINTS', 100);

    return this.prismaService.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          ...input,
          pointsBalance: initialPoints,
        },
      });

      if (initialPoints > 0) {
        await transaction.pointsLedgerEntry.create({
          data: {
            balanceAfter: initialPoints,
            delta: initialPoints,
            idempotencyKey: `signup:${user.id}`,
            referenceId: user.id,
            referenceType: 'user_signup',
            type: 'GRANT',
            userId: user.id,
          },
        });
      }

      return user;
    });
  }

  private async issueAuthResult(user: User, request: Request): Promise<AuthResult> {
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: '当前账号已停用',
      });
    }

    const refreshToken = this.tokenService.createRefreshToken();

    await this.prismaService.refreshSession.create({
      data: {
        expiresAt: refreshToken.expiresAt,
        ipAddress: request.ip,
        tokenHash: refreshToken.tokenHash,
        userAgent: request.header('user-agent'),
        userId: user.id,
      },
    });

    return {
      accessToken: this.tokenService.signAccessToken(user),
      expiresIn: this.tokenService.accessTokenExpiresIn,
      refreshToken: refreshToken.token,
      user: this.tokenService.toAuthenticatedUser(user),
    };
  }
}
