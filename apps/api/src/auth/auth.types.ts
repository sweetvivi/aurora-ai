import type { UserRole, UserStatus } from '@prisma/client';

export interface AuthenticatedUser {
  displayName: string;
  email: string | null;
  id: string;
  pointsBalance: number;
  role: UserRole;
  status: UserStatus;
}

export interface AccessTokenClaims {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  role: UserRole;
  sub: string;
  type: 'access';
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}
