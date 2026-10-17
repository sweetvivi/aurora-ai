import { defineStore } from 'pinia';
import {
  ApiError,
  type AuthenticatedUser,
  clearAuthSession,
  devLogin,
  emailLogin,
  emailRegister,
  fetchCurrentUser,
  getRefreshToken,
  hasStoredTokens,
  logout as requestLogout,
  setAuthSession,
} from '@/app/api';

const AUTO_LOGIN_DISABLED_KEY = 'aurora.auth.autoLoginDisabled';
let bootstrapPromise: Promise<void> | null = null;

export type SessionStatus = 'anonymous' | 'authenticated' | 'error' | 'loading';

interface SessionState {
  error: ApiError | null;
  status: SessionStatus;
  user: AuthenticatedUser | null;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    error: null,
    status: 'anonymous',
    user: null,
  }),
  getters: {
    authenticated: (state) => state.status === 'authenticated' && state.user !== null,
    displayName: (state) => state.user?.displayName ?? '未登录',
    initials: (state) => state.user?.displayName.slice(0, 1) || '?',
    points: (state) => state.user?.pointsBalance ?? 0,
    tier: (state) => (state.user ? '开发体验版' : '请登录'),
  },
  actions: {
    async bootstrap(): Promise<void> {
      if (this.status === 'authenticated') {
        return;
      }

      if (!bootstrapPromise) {
        bootstrapPromise = this.initializeSession().finally(() => {
          bootstrapPromise = null;
        });
      }

      return bootstrapPromise;
    },
    async initializeSession(): Promise<void> {
      this.status = 'loading';
      this.error = null;

      if (hasStoredTokens()) {
        try {
          this.user = await fetchCurrentUser();
          this.status = 'authenticated';
          return;
        } catch (error) {
          clearAuthSession();
          this.error = toApiError(error);
        }
      }

      if (this.shouldAutoDevLogin()) {
        await this.loginAsGuest();
        return;
      }

      this.status = 'anonymous';
    },
    async loginAsGuest(): Promise<void> {
      this.status = 'loading';
      this.error = null;

      try {
        const result = await devLogin({
          displayName: '演示用户',
        });

        setAuthSession(result);
        setAutoLoginDisabled(false);
        this.user = result.user;
        this.status = 'authenticated';
      } catch (error) {
        this.user = null;
        this.error = toApiError(error);
        this.status = 'error';
      }
    },
    async loginWithEmail(email: string, password: string): Promise<boolean> {
      this.status = 'loading';
      this.error = null;

      try {
        const result = await emailLogin({
          email: email.trim(),
          password,
        });

        setAuthSession(result);
        setAutoLoginDisabled(false);
        this.user = result.user;
        this.status = 'authenticated';
        return true;
      } catch (error) {
        this.error = toApiError(error);
        this.status = 'anonymous';
        return false;
      }
    },
    async registerWithEmail(
      displayName: string,
      email: string,
      password: string,
    ): Promise<boolean> {
      this.status = 'loading';
      this.error = null;

      try {
        const result = await emailRegister({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        });

        setAuthSession(result);
        setAutoLoginDisabled(false);
        this.user = result.user;
        this.status = 'authenticated';
        return true;
      } catch (error) {
        this.error = toApiError(error);
        this.status = 'anonymous';
        return false;
      }
    },
    async logout(): Promise<void> {
      const refreshToken = getRefreshToken();

      try {
        if (refreshToken) {
          await requestLogout(refreshToken);
        }
      } catch {
        // Local logout must still succeed if the API is unavailable.
      } finally {
        clearAuthSession();
        setAutoLoginDisabled(true);
        this.user = null;
        this.error = null;
        this.status = 'anonymous';
      }
    },
    async refreshProfile(): Promise<void> {
      if (!hasStoredTokens()) {
        this.status = 'anonymous';
        this.user = null;
        return;
      }

      try {
        this.user = await fetchCurrentUser();
        this.status = 'authenticated';
      } catch (error) {
        this.error = toApiError(error);
      }
    },
    setSessionExpired(): void {
      clearAuthSession();
      this.user = null;
      this.error = new ApiError('登录状态已失效，请重新登录', {
        code: 'INVALID_REFRESH_TOKEN',
        status: 401,
      });
      this.status = 'anonymous';
    },
    updatePoints(points: number): void {
      if (this.user) {
        this.user = {
          ...this.user,
          pointsBalance: points,
        };
      }
    },
    shouldAutoDevLogin(): boolean {
      return (
        import.meta.env.DEV &&
        import.meta.env.VITE_AUTO_DEV_LOGIN !== 'false' &&
        !isAutoLoginDisabled()
      );
    },
  },
});

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('登录失败，请稍后重试');
}

function isAutoLoginDisabled(): boolean {
  try {
    return window.localStorage.getItem(AUTO_LOGIN_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setAutoLoginDisabled(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(AUTO_LOGIN_DISABLED_KEY, 'true');
    } else {
      window.localStorage.removeItem(AUTO_LOGIN_DISABLED_KEY);
    }
  } catch {
    // Ignore storage policy failures.
  }
}
