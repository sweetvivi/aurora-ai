import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AccessTokenClaims, AuthenticatedUser } from './auth.types';

interface RefreshTokenValue {
  expiresAt: Date;
  token: string;
  tokenHash: string;
}

@Injectable()
export class TokenService {
  private readonly accessTokenTtlSeconds: number;
  private readonly issuer = 'aurora-api';
  private readonly audience = 'aurora-web';
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.getOrThrow<string>('AUTH_TOKEN_SECRET');
    this.accessTokenTtlSeconds = this.configService.get<number>(
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
      900,
    );
  }

  signAccessToken(user: Pick<User, 'id' | 'role'>): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const claims: AccessTokenClaims = {
      aud: this.audience,
      exp: now + this.accessTokenTtlSeconds,
      iat: now,
      iss: this.issuer,
      jti: randomUUID(),
      role: user.role,
      sub: user.id,
      type: 'access',
    };
    const payload = this.encode(claims);
    const signature = this.sign(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      throw this.unauthorized('INVALID_ACCESS_TOKEN', '访问令牌格式无效');
    }

    const expectedSignature = this.sign(`${header}.${payload}`);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw this.unauthorized('INVALID_ACCESS_TOKEN', '访问令牌签名无效');
    }

    let claims: AccessTokenClaims;

    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessTokenClaims;
    } catch {
      throw this.unauthorized('INVALID_ACCESS_TOKEN', '访问令牌内容无效');
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      claims.type !== 'access' ||
      claims.iss !== this.issuer ||
      claims.aud !== this.audience ||
      claims.exp <= now
    ) {
      throw this.unauthorized('ACCESS_TOKEN_EXPIRED', '访问令牌已过期，请刷新后重试');
    }

    return claims;
  }

  createRefreshToken(): RefreshTokenValue {
    const token = randomBytes(48).toString('base64url');
    const ttlDays = this.configService.get<number>('AUTH_REFRESH_TOKEN_TTL_DAYS', 30);

    return {
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      token,
      tokenHash: this.hashRefreshToken(token),
    };
  }

  get accessTokenExpiresIn(): number {
    return this.accessTokenTtlSeconds;
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      pointsBalance: user.pointsBalance,
      role: user.role,
      status: user.status,
    };
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private unauthorized(code: string, message: string): UnauthorizedException {
    return new UnauthorizedException({
      code,
      message,
    });
  }
}
