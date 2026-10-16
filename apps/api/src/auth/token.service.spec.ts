import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const createService = () =>
    new TokenService(
      new ConfigService({
        AUTH_ACCESS_TOKEN_TTL_SECONDS: 60,
        AUTH_TOKEN_SECRET: 'test-secret-with-enough-characters',
      }),
    );

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs and verifies an access token', () => {
    const service = createService();
    const token = service.signAccessToken({ id: 'user-1', role: 'USER' });

    expect(service.verifyAccessToken(token)).toMatchObject({
      role: 'USER',
      sub: 'user-1',
      type: 'access',
    });
  });

  it('rejects a tampered access token', () => {
    const service = createService();
    const token = service.signAccessToken({ id: 'user-1', role: 'USER' });
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => service.verifyAccessToken(tampered)).toThrow('访问令牌签名无效');
  });

  it('rejects an expired access token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T10:00:00.000Z'));

    const service = createService();
    const token = service.signAccessToken({ id: 'user-1', role: 'USER' });

    vi.setSystemTime(new Date('2026-10-16T10:01:01.000Z'));

    expect(() => service.verifyAccessToken(token)).toThrow('访问令牌已过期，请刷新后重试');
  });
});
