import type { AuthenticatedUser } from '../auth/auth.types';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }
  }
}
