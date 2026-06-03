import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock Clerk before any import that touches it.
vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

// Mock the FE's useAuth hook (AuthContext wrapper).
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks')>('@/hooks');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/hooks';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from '@/constants';
import type { User } from '@/types';

const PROTECTED_CONTENT = 'protected-content-marker';

function withRouter(
  children: ReactNode,
  initialPath = '/protected',
): ReactElement {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={children} />
        <Route path={ROUTES.LOGIN} element={<span>login-page</span>} />
        <Route path={ROUTES.DASHBOARD} element={<span>customer-dashboard</span>} />
        <Route path={ROUTES.ADMIN_DASHBOARD} element={<span>admin-dashboard</span>} />
        <Route path={ROUTES.FORBIDDEN} element={<span>forbidden-page</span>} />
        <Route path={ROUTES.MFA_ENROLL} element={<span>mfa-enroll-page</span>} />
        <Route path={ROUTES.STAFF_ONBOARDING} element={<span>staff-onboarding-page</span>} />
      </Routes>
    </MemoryRouter>
  );
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    email: 'op@example.com',
    firstName: 'Op',
    lastName: 'One',
    role: 'staff',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function mockAuth({
  user = null,
  isLoading = false,
  isClerkSignedIn = false,
  isClerkLoaded = true,
}: {
  user?: User | null;
  isLoading?: boolean;
  isClerkSignedIn?: boolean;
  isClerkLoaded?: boolean;
}): void {
  vi.mocked(useAuth).mockReturnValue({
    user,
    isAuthenticated: !!user,
    isLoading,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshUser: vi.fn(),
    completeMfaChallenge: vi.fn(),
  });
  vi.mocked(useClerkAuth).mockReturnValue({
    isSignedIn: isClerkSignedIn,
    isLoaded: isClerkLoaded,
  } as unknown as ReturnType<typeof useClerkAuth>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockAuth({}); // default = unauthenticated, not Clerk-signed-in
});

describe('ProtectedRoute', () => {
  it('renders children for an authenticated user whose role is allowed', () => {
    mockAuth({ user: makeUser({ role: 'staff' }) });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText(PROTECTED_CONTENT)).toBeTruthy();
  });

  it('redirects an unauthenticated visitor to /login', () => {
    mockAuth({}); // no user, no Clerk session
    const { getByText } = render(
      withRouter(
        <ProtectedRoute allowedRoles={['user']}>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('login-page')).toBeTruthy();
  });

  it('redirects a customer (Clerk-signed-in) hitting an admin route', () => {
    // Clerk-signed-in customer with no internal user → effective role is 'user'.
    // /admin/dashboard requires staff+; redirectTo is /dashboard.
    mockAuth({ isClerkSignedIn: true });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute
          allowedRoles={['staff', 'admin', 'superadmin']}
          redirectTo={ROUTES.DASHBOARD}
        >
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('customer-dashboard')).toBeTruthy();
  });

  it('falls back to /forbidden when allowed-roles fail and no redirectTo set', () => {
    mockAuth({ user: makeUser({ role: 'staff' }) });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute allowedRoles={['superadmin']}>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('forbidden-page')).toBeTruthy();
  });

  it('honours blockedRoles', () => {
    mockAuth({ user: makeUser({ role: 'user' }) });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute blockedRoles={['user']} redirectTo={ROUTES.DASHBOARD}>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('customer-dashboard')).toBeTruthy();
  });

  it('hard-redirects to /mfa/enroll when mustEnrollMfa is true', () => {
    mockAuth({
      user: makeUser({ role: 'superadmin', mustEnrollMfa: true }),
    });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('mfa-enroll-page')).toBeTruthy();
  });

  it('does NOT redirect to /mfa/enroll if the current route already is /mfa/enroll', () => {
    // The MfaEnrollmentPage itself is wrapped in ProtectedRoute with
    // allowedRoles=['staff','admin','superadmin']; without the in-route
    // bypass, the guard would loop forever (redirect → redirect → ...).
    mockAuth({
      user: makeUser({ role: 'staff', mustEnrollMfa: true }),
    });
    const { getByText } = render(
      <MemoryRouter initialEntries={[ROUTES.MFA_ENROLL]}>
        <Routes>
          <Route
            path={ROUTES.MFA_ENROLL}
            element={
              <ProtectedRoute>
                <span>{PROTECTED_CONTENT}</span>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(getByText(PROTECTED_CONTENT)).toBeTruthy();
  });

  it('redirects to /staff-onboarding when mustChangePassword is true', () => {
    mockAuth({
      user: makeUser({ role: 'staff', mustChangePassword: true }),
    });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('staff-onboarding-page')).toBeTruthy();
  });

  it('redirects to /staff-onboarding when mustCompleteProfile is true', () => {
    mockAuth({
      user: makeUser({ role: 'staff', mustCompleteProfile: true }),
    });
    const { getByText } = render(
      withRouter(
        <ProtectedRoute>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    expect(getByText('staff-onboarding-page')).toBeTruthy();
  });

  it('shows the loader while auth state is still resolving', () => {
    mockAuth({ isLoading: true });
    const { container } = render(
      withRouter(
        <ProtectedRoute>
          <span>{PROTECTED_CONTENT}</span>
        </ProtectedRoute>,
      ),
    );
    // PageLoader renders fixed full-screen chrome; just check we don't
    // leak the protected child or any redirect target.
    expect(container.textContent ?? '').not.toContain(PROTECTED_CONTENT);
    expect(container.textContent ?? '').not.toContain('login-page');
  });
});
