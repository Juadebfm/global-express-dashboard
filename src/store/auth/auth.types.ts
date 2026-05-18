import type { User, LoginCredentials } from '@/types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type LoginResult =
  | { kind: 'success' }
  | { kind: 'mfa_required'; mfaToken: string; userId: string };

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  /**
   * Persist the post-MFA token + user returned by /auth/mfa/verify or
   * /auth/mfa/recovery. Kept separate from `login` so the MFA challenge
   * screen can drive it directly.
   */
  completeMfaChallenge: (params: { user: User; token: string }) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}
