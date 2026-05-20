import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LoginCredentials, User } from '@/types';
import { login as apiLogin, getMe, logout as apiLogout } from '@/services/authService';
import { useLanguageStore } from '@/store/language';
import type { AuthContextValue, AuthState, LoginResult } from './auth.types';
import { AuthContext } from './auth.context';

const TOKEN_KEY = 'globalxpress_token';

function syncLanguageFromUser(user: User): void {
  const lang = user.preferredLanguage;
  if (lang === 'en' || lang === 'ko') {
    useLanguageStore.getState().setLanguage(lang);
  }
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [state, setState] = useState<AuthState>(initialState);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const user = await getMe(token);

      // If the session returned no usable role, treat it as invalid
      if (!user?.role) {
        throw new Error('Incomplete session');
      }

      syncLanguageFromUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Single 401 handler — apiClient dispatches `auth:unauthorized` whenever
  // any request gets a 401. Clear in-house session state; ProtectedRoute
  // sees isAuthenticated=false on the next render and redirects to /login.
  useEffect(() => {
    const handler = (): void => {
      if (!localStorage.getItem(TOKEN_KEY)) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('globalxpress_refresh');
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const outcome = await apiLogin(credentials);

      if (outcome.kind === 'mfa_required') {
        // Don't persist anything yet — the MFA challenge screen holds the
        // mfaToken in memory and calls completeMfaChallenge on success.
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return { kind: 'mfa_required', mfaToken: outcome.mfaToken, userId: outcome.userId };
      }

      localStorage.setItem(TOKEN_KEY, outcome.token);
      syncLanguageFromUser(outcome.user);
      setState({
        user: outcome.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { kind: 'success' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const completeMfaChallenge = useCallback(
    ({ user, token }: { user: User; token: string }) => {
      localStorage.setItem(TOKEN_KEY, token);
      syncLanguageFromUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      if (token) await apiLogout(token);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('globalxpress_refresh');
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const user = await getMe(token);
      if (!user?.role) return;
      syncLanguageFromUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      /* keep current state on failure */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      completeMfaChallenge,
      logout,
      clearError,
      refreshUser,
    }),
    [state, login, completeMfaChallenge, logout, clearError, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
