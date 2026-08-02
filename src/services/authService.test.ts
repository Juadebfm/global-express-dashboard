import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  confirmMyAvatar,
  adminResetPassword,
  getMe,
  login,
  presignMyAvatar,
  register,
  removeMyAvatar,
  syncClerkAccount,
  uploadAvatarFile,
} from './authService';

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

function lastCall(): { url: string; init: RequestInit } {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls.at(-1) ?? ['', {}];
  return { url: String(url), init: init as RequestInit };
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

describe('adminResetPassword', () => {
  it('sends only the temporary password and unwraps the safe account state', async () => {
    mockFetch({
      success: true,
      data: {
        message: 'Temporary password set',
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          role: 'staff',
          isActive: true,
          mustChangePassword: true,
          mustCompleteProfile: false,
        },
        sessionsInvalidated: true,
      },
    });

    const result = await adminResetPassword(
      'superadmin-token',
      '11111111-1111-4111-8111-111111111111',
      { newPassword: 'temporary-pass' },
    );

    expect(result.sessionsInvalidated).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    const { url, init } = lastCall();
    expect(url).toContain('/internal/users/11111111-1111-4111-8111-111111111111/password');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ newPassword: 'temporary-pass' });
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer superadmin-token');
  });
});

describe('self-service avatar', () => {
  it('presigns with the selected content type and authenticated user only', async () => {
    mockFetch({
      success: true,
      data: { uploadUrl: 'https://r2.example/upload', r2Key: 'avatars/u/avatar.webp', publicUrl: 'https://cdn.example/avatar.webp', expiresInSeconds: 300 },
    });

    await presignMyAvatar('token', { contentType: 'image/webp' });

    const { url, init } = lastCall();
    expect(url).toContain('/users/me/avatar/presign');
    expect(JSON.parse(init.body as string)).toEqual({ contentType: 'image/webp' });
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
  });

  it('uploads raw bytes to R2 without an application bearer token', async () => {
    mockFetch({});
    const file = new File(['avatar'], 'avatar.webp', { type: 'image/webp' });

    await uploadAvatarFile('https://r2.example/upload', file);

    const { url, init } = lastCall();
    expect(url).toBe('https://r2.example/upload');
    expect(init.method).toBe('PUT');
    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('image/webp');
    expect(headers.has('Authorization')).toBe(false);
    expect(init.body).toBe(file);
  });

  it('confirms and removes only the current user avatar', async () => {
    mockFetch({ success: true, data: { avatarUrl: 'https://cdn.example/avatar.webp' } });
    await confirmMyAvatar('token', 'avatars/u/avatar.webp');
    let call = lastCall();
    expect(call.url).toContain('/users/me/avatar');
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(call.init.body as string)).toEqual({ r2Key: 'avatars/u/avatar.webp' });

    mockFetch({ success: true, data: { avatarUrl: null } });
    await removeMyAvatar('token');
    call = lastCall();
    expect(call.url).toContain('/users/me/avatar');
    expect(call.init.method).toBe('DELETE');
    expect(new Headers(call.init.headers).get('Authorization')).toBe('Bearer token');
  });

  it('syncs Clerk without a request body and returns the updated user', async () => {
    mockFetch({
      success: true,
      data: { id: 'u1', email: 'a@b.test', avatarUrl: 'https://cdn.example/avatar.webp', firstName: 'A', lastName: 'B', role: 'user', createdAt: '', updatedAt: '' },
    });

    await expect(syncClerkAccount('token')).resolves.toMatchObject({
      avatarUrl: 'https://cdn.example/avatar.webp',
    });
    const { init } = lastCall();
    expect(init.body).toBeUndefined();
  });
});
