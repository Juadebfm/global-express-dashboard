import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LoginCredentials, User } from '@/types';
import { login as apiLogin, getMe, getInternalMe, logout as apiLogout } from '@/services/authService';
import { useLanguageStore } from '@/store/language';
import { queryClient } from '@/lib/queryClient';
import type { AuthContextValue, AuthState, LoginResult } from './auth.types';
import { AuthContext } from './auth.context';

const INTERNAL_ROLES = new Set(['staff', 'admin', 'superadmin']);
function isInternalRole(role: string | undefined): boolean {
  return role !== undefined && INTERNAL_ROLES.has(role);
}

// Pick the authoritative endpoint based on role. Internal staff must use
// /internal/me — it returns isActive/mustChangePassword/mustCompleteProfile.
async function fetchUser(token: string, role: string | undefined): Promise<User> {
  return isInternalRole(role) ? getInternalMe(token) : getMe(token);
}

const TOKEN_KEY = 'globalxpress_token';

// Tab refocus only refreshes /auth/me if the page has been idle for at
// least this long. Without it a user clicking between two open tabs of
// the app would fire a probe on every switch. 5 minutes lines up with
// our SLOW_MOVING staleTime window for settings/catalogs.
const REFRESH_ON_FOCUS_IDLE_MS = 5 * 60 * 1000;

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

  // Timestamp of the last successful me-probe. The visibilitychange effect
  // uses this to decide whether a tab refocus should re-sync or skip.
  const lastSyncedAtRef = useRef<number>(0);

  // Tracks the current user's role without stale closure issues so that the
  // visibilitychange / 403 handlers (registered once) can pick the right
  // endpoint for each refresh.
  const currentRoleRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    currentRoleRef.current = state.user?.role;
  }, [state.user?.role]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // /auth/me is the boot-time probe for ALL users — it returns isActive,
      // mustChangePassword, and mustCompleteProfile. /internal/me is only
      // called via refreshUser (after login / profile save) where we already
      // know the role and want the latest flags without a double round-trip.
      const user = await getMe(token);

      // If the session returned no usable role, treat it as invalid
      if (!user?.role) {
        throw new Error('Incomplete session');
      }

      syncLanguageFromUser(user);
      lastSyncedAtRef.current = Date.now();
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

  // Periodic role refresh on tab refocus. If the user came back after
  // being idle ≥5 min, refetch /auth/me so a mid-session role upgrade
  // (staff → admin, permission flag flipped, etc.) propagates without
  // forcing a log-out / log-in. Same shape as the 403 handler below.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const elapsed = Date.now() - lastSyncedAtRef.current;
      if (elapsed < REFRESH_ON_FOCUS_IDLE_MS) return;
      try {
        const user = await fetchUser(token, currentRoleRef.current);
        if (!user?.role) return;
        syncLanguageFromUser(user);
        lastSyncedAtRef.current = Date.now();
        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
      } catch {
        /* If the refresh itself 401s, the apiClient handler clears
           state. Don't double-handle here. */
      }
    };
    const wrapper = (): void => { void handler(); };
    document.addEventListener('visibilitychange', wrapper);
    return () => document.removeEventListener('visibilitychange', wrapper);
  }, []);

  // Single 403 handler — apiClient dispatches `auth:forbidden` whenever
  // any non-boot-probe request gets a 403. Could mean (a) the user is
  // trying to do something their role never allowed, OR (b) their role
  // was demoted mid-session. We can't tell which from one response, so
  // we refetch /auth/me to catch case (b). If the role didn't actually
  // change, this is a cheap no-op.
  //
  // Inlined rather than calling refreshUser() (defined later) to avoid the
  // useEffect dep / ref dance.
  useEffect(() => {
    const handler = async (): Promise<void> => {
      const token = localStorage.getItem(TOKEN_KEY);
      // Only refresh if we still think we're logged in — otherwise this
      // races into the 401 handler below.
      if (!token) return;
      try {
        const user = await fetchUser(token, currentRoleRef.current);
        if (!user?.role) return;
        syncLanguageFromUser(user);
        lastSyncedAtRef.current = Date.now();
        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
      } catch {
        /* If the me probe fails too, the 401 handler will pick it up. */
      }
    };
    const wrapper = (): void => { void handler(); };
    window.addEventListener('auth:forbidden', wrapper);
    return () => window.removeEventListener('auth:forbidden', wrapper);
  }, []);

  // Single 401 handler — apiClient dispatches `auth:unauthorized` whenever
  // any request gets a 401. Clear in-house session state; ProtectedRoute
  // sees isAuthenticated=false on the next render and redirects to /login.
  useEffect(() => {
    const handler = (): void => {
      if (!localStorage.getItem(TOKEN_KEY)) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('globalxpress_refresh');
      // Wipe cached server state too — a revoked token means everything
      // we have is from the now-invalid session. Without this, a user-B
      // login on the same browser could briefly read user-A's cached
      // orders/notifications/etc. (query keys don't include user.id).
      queryClient.clear();
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
      // For internal staff, enrich the login-response user with
      // /internal/me so we get isActive/mustCompleteProfile immediately.
      let user = outcome.user;
      if (isInternalRole(user.role)) {
        try {
          user = await getInternalMe(outcome.token);
        } catch {
          // fall back to login-response user if /internal/me is unavailable
        }
      }
      syncLanguageFromUser(user);
      setState({
        user,
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
    ({ user: loginUser, token }: { user: User; token: string }) => {
      localStorage.setItem(TOKEN_KEY, token);
      syncLanguageFromUser(loginUser);
      setState({
        user: loginUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      // Fire-and-forget enrichment for internal staff — sets isActive/flags
      // as soon as /internal/me responds without blocking the login transition.
      if (isInternalRole(loginUser.role)) {
        void getInternalMe(token)
          .then((fullUser) => {
            syncLanguageFromUser(fullUser);
            setState({ user: fullUser, isAuthenticated: true, isLoading: false, error: null });
          })
          .catch(() => { /* loginUser is a usable fallback */ });
      }
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
      // Wipe the React Query cache so a same-browser switch (user-A
      // logs out, user-B logs in) can't briefly render A's data. Most
      // query keys don't include user.id, so without this the next
      // render would hit the cache instead of refetching.
      queryClient.clear();
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
      const user = await fetchUser(token, currentRoleRef.current);
      if (!user?.role) return;
      syncLanguageFromUser(user);
      lastSyncedAtRef.current = Date.now();
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
