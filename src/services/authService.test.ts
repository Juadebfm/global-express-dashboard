import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMe, login, register } from './authService';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  ) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('login', () => {
  it('unwraps { success, data: { user, token } } into a success LoginOutcome', async () => {
    mockFetch({
      success: true,
      data: {
        token: 'jwt-1',
        user: {
          id: 'u1',
          email: 'a@b.test',
          firstName: 'A',
          lastName: 'B',
          role: 'staff',
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    const out = await login({ email: 'a@b.test', password: 'pw' });

    expect(out.kind).toBe('success');
    if (out.kind === 'success') {
      expect(out.token).toBe('jwt-1');
      expect(out.user.id).toBe('u1');
    }

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/internal/auth/login');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('unwraps mfaRequired into an mfa_required LoginOutcome', async () => {
    mockFetch({
      success: true,
      data: { mfaRequired: true, mfaToken: 'short-lived', userId: 'u1' },
    });

    const out = await login({ email: 'a@b.test', password: 'pw' });

    expect(out.kind).toBe('mfa_required');
    if (out.kind === 'mfa_required') {
      expect(out.mfaToken).toBe('short-lived');
      expect(out.userId).toBe('u1');
    }
  });

  it('throws an ApiError with the backend message on 401', async () => {
    mockFetch({ message: 'Invalid email or password' }, 401);
    await expect(login({ email: 'a@b.test', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    );
  });
});

describe('register', () => {
  it('unwraps the Clerk-fallback message + URL', async () => {
    mockFetch({
      success: true,
      data: {
        message: 'Register via Clerk',
        clerkSignUpUrl: 'https://clerk.example.com/sign-up',
      },
    });

    const result = await register();

    expect(result.message).toBe('Register via Clerk');
    expect(result.clerkSignUpUrl).toBe('https://clerk.example.com/sign-up');
  });
});

describe('getMe', () => {
  it('unwraps { success, data: User } and returns the user', async () => {
    mockFetch({
      success: true,
      data: {
        id: 'u1',
        email: 'a@b.test',
        firstName: 'A',
        lastName: 'B',
        role: 'admin',
        createdAt: '',
        updatedAt: '',
      },
    });

    const user = await getMe('token');
    expect(user.id).toBe('u1');
    expect(user.role).toBe('admin');
  });

  it('attaches Authorization: Bearer <token>', async () => {
    mockFetch({
      success: true,
      data: { id: 'u', email: '', firstName: '', lastName: '', role: 'user', createdAt: '', updatedAt: '' },
    });
    await getMe('jwt-x');
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer jwt-x');
  });
});
