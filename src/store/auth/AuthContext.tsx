import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useUser as useClerkUser } from '@clerk/clerk-react';
import type { LoginCredentials, PasswordChangeResult, User } from '@/types';
import { login as apiLogin, getMe, getInternalMe, logout as apiLogout } from '@/services/authService';
import { useLanguageStore } from '@/store/language';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/constants';
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
  const navigate = useNavigate();
  const { signOut: clerkSignOut } = useClerk();
  const { user: clerkUser } = useClerkUser();

  // Timestamp of the last successful me-probe. The visibilitychange effect
  // uses this to decide whether a tab refocus should re-sync or skip.
  const lastSyncedAtRef = useRef<number>(0);

  // Tracks the current user's role without stale closure issues so that the
  // visibilitychange / 403 handlers (registered once) can pick the right
  // endpoint for each refresh.
  const currentRoleRef = useRef<string | undefined>(undefined);
  const refreshUserPromiseRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    currentRoleRef.current = state.user?.role;
  }, [state.user?.role]);

  const checkAuth = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
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
      sessionStorage.removeItem(TOKEN_KEY);
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

  // All account-status refresh paths (the pending-approval button, a tab
  // refocus, and a role-change 403) share one in-flight request. Without
  // this, a forbidden operational request could fan out into concurrent
  // status probes and make the UI flicker between stale states.
  const refreshUser = useCallback((): Promise<void> => {
    if (refreshUserPromiseRef.current) return refreshUserPromiseRef.current;

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return Promise.resolve();

    const refresh = (async (): Promise<void> => {
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
        /* Keep the current state when the status probe itself fails. */
      }
    })();

    refreshUserPromiseRef.current = refresh;
    void refresh.finally(() => {
      if (refreshUserPromiseRef.current === refresh) {
        refreshUserPromiseRef.current = null;
      }
    });
    return refresh;
  }, []);

  // Periodic role refresh on tab refocus. If the user came back after
  // being idle ≥5 min, refetch /auth/me so a mid-session role upgrade
  // (staff → admin, permission flag flipped, etc.) propagates without
  // forcing a log-out / log-in. Same shape as the 403 handler below.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Date.now() - lastSyncedAtRef.current;
      if (elapsed < REFRESH_ON_FOCUS_IDLE_MS) return;
      await refreshUser();
    };
    const wrapper = (): void => { void handler(); };
    document.addEventListener('visibilitychange', wrapper);
    return () => document.removeEventListener('visibilitychange', wrapper);
  }, [refreshUser]);

  // Single 403 handler — apiClient dispatches `auth:forbidden` whenever
  // any non-boot-probe request gets a 403. Could mean (a) the user is
  // trying to do something their role never allowed, OR (b) their role
  // was demoted mid-session. We can't tell which from one response, so
  // we refetch /auth/me to catch case (b). If the role didn't actually
  // change, this is a cheap no-op.
  //
  useEffect(() => {
    const wrapper = (): void => { void refreshUser(); };
    window.addEventListener('auth:forbidden', wrapper);
    return () => window.removeEventListener('auth:forbidden', wrapper);
  }, [refreshUser]);

  // Single 401 handler — apiClient dispatches `auth:unauthorized` whenever
  // any request gets a 401 (this also covers the backend's "session has been
  // revoked" 401, sent when a token predates a delete-triggered
  // sessionInvalidatedAt — there's no distinct code for that case, it's just
  // a 401, so any 401 here is treated as a forced sign-out). Clears whichever
  // auth surface was actually in use — internal JWT, Clerk, or both — and
  // routes to the matching sign-in page.
  useEffect(() => {
    const handler = (): void => {
      const hadInternalSession = !!sessionStorage.getItem(TOKEN_KEY);
      const hadClerkSession = !!clerkUser;
      if (!hadInternalSession && !hadClerkSession) return;

      if (hadInternalSession) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem('globalxpress_refresh');
      }
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

      if (hadClerkSession) {
        void clerkSignOut().catch(() => { /* best-effort — still navigating regardless */ });
        navigate(ROUTES.SIGN_IN, { replace: true });
      } else {
        navigate(ROUTES.LOGIN, { replace: true });
      }
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [navigate, clerkSignOut, clerkUser]);

  // Deleted-but-reactivatable customer account — apiClient dispatches
  // `auth:pending-reactivation` on any 409 with code `pending_reactivation`.
  // For Clerk customers this most often surfaces on the first authenticated
  // backend call after sign-in (not the login form itself), so it's handled
  // centrally here rather than per-caller. Clear both auth surfaces and send
  // them to the reactivation page, prefilling the email if Clerk knows it.
  useEffect(() => {
    const handler = (): void => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('globalxpress_refresh');
      queryClient.clear();
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      void clerkSignOut().catch(() => { /* best-effort — still navigating regardless */ });
      navigate(
        email ? `${ROUTES.REACTIVATE_ACCOUNT}?email=${encodeURIComponent(email)}` : ROUTES.REACTIVATE_ACCOUNT,
        { replace: true },
      );
    };
    window.addEventListener('auth:pending-reactivation', handler);
    return () => window.removeEventListener('auth:pending-reactivation', handler);
  }, [navigate, clerkSignOut, clerkUser]);

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

      sessionStorage.setItem(TOKEN_KEY, outcome.token);
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
      sessionStorage.setItem(TOKEN_KEY, token);
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
    const token = sessionStorage.getItem(TOKEN_KEY);
    try {
      if (token) await apiLogout(token);
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('globalxpress_refresh');
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

  const completePasswordChange = useCallback((result: PasswordChangeResult): void => {
    lastSyncedAtRef.current = Date.now();
    setState((prev) => {
      if (!prev.user) return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          isActive: result.isActive,
          mustChangePassword: result.mustChangePassword,
          mustCompleteProfile: result.mustCompleteProfile,
        },
        isLoading: false,
        error: null,
      };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      completeMfaChallenge,
      logout,
      clearError,
      refreshUser,
      completePasswordChange,
    }),
    [state, login, completeMfaChallenge, logout, clearError, refreshUser, completePasswordChange]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
