import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LoginCredentials, RegisterData } from '@/types';
import { mockLogin, mockRegister, mockLogout, mockGetCurrentUser } from '@/data';
import type { AuthContextValue, AuthState } from './auth.types';
import { AuthContext } from './auth.context';

const TOKEN_KEY = 'globalxpress_token';

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
      const user = await mockGetCurrentUser(token);
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

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await mockLogin(credentials);
      localStorage.setItem(TOKEN_KEY, response.tokens.accessToken);
      localStorage.setItem('globalxpress_user', response.user.email);

      if (credentials.rememberMe && response.tokens.refreshToken) {
        localStorage.setItem('globalxpress_refresh', response.tokens.refreshToken);
      }

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
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

  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await mockRegister(data);
      localStorage.setItem(TOKEN_KEY, response.tokens.accessToken);
      localStorage.setItem('globalxpress_user', response.user.email);

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await mockLogout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('globalxpress_refresh');
      localStorage.removeItem('globalxpress_user');
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

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      clearError,
    }),
    [state, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
