import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  clearAuthSession: vi.fn(),
  devLogin: vi.fn(),
  emailLogin: vi.fn(),
  emailRegister: vi.fn(),
  fetchCurrentUser: vi.fn(),
  getRefreshToken: vi.fn(),
  hasStoredTokens: vi.fn(),
  logout: vi.fn(),
  setAuthSession: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { useSessionStore } from './session';

const storedUser = {
  displayName: '恢复用户',
  email: 'restore@example.com',
  id: 'user-restored',
  pointsBalance: 88,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('restores a stored session once when bootstrap runs concurrently', async () => {
    let resolveUser: (user: typeof storedUser) => void = () => undefined;
    const userPromise = new Promise<typeof storedUser>((resolve) => {
      resolveUser = resolve;
    });

    apiMocks.hasStoredTokens.mockReturnValue(true);
    apiMocks.fetchCurrentUser.mockReturnValue(userPromise);

    const store = useSessionStore();
    const firstBootstrap = store.bootstrap();
    const secondBootstrap = store.bootstrap();

    expect(apiMocks.fetchCurrentUser).toHaveBeenCalledTimes(1);

    resolveUser(storedUser);
    await Promise.all([firstBootstrap, secondBootstrap]);

    expect(store.status).toBe('authenticated');
    expect(store.user).toEqual(storedUser);
  });

  it('falls back to a development login when no stored session exists', async () => {
    const authResult = {
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      user: storedUser,
    };

    apiMocks.hasStoredTokens.mockReturnValue(false);
    apiMocks.devLogin.mockResolvedValue(authResult);

    const store = useSessionStore();

    await store.bootstrap();

    expect(apiMocks.devLogin).toHaveBeenCalledWith({ displayName: '演示用户' });
    expect(apiMocks.setAuthSession).toHaveBeenCalledWith(authResult);
    expect(store.status).toBe('authenticated');
    expect(store.user).toEqual(storedUser);
  });

  it('handles a session payload without a display name', () => {
    const store = useSessionStore();

    store.user = {
      ...storedUser,
      displayName: undefined as unknown as string,
    };

    expect(store.displayName).toBe('未登录');
    expect(store.initials).toBe('?');
  });
});
