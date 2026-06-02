import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  verifyMfaChallenge,
  recoverWithMfaRecoveryCode,
  getMfaStatus,
  enrollMfa,
  verifyMfaEnrollment,
  disableMfa,
  regenerateRecoveryCodes,
} from './mfaService';

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

describe('verifyMfaChallenge', () => {
  it('exchanges mfaToken + code for a real access token', async () => {
    // BE wraps in { success, data } as of the REST standards pass.
    mockFetch({
      success: true,
      data: {
        user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'staff', createdAt: '', updatedAt: '' },
        tokens: { accessToken: 'jwt-123' },
      },
    });

    const result = await verifyMfaChallenge({ mfaToken: 'm-token', code: '123456' });

    expect(result.token).toBe('jwt-123');
    expect(result.user.id).toBe('u1');

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/auth/mfa/verify');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('surfaces 401 errors as Error with backend message', async () => {
    mockFetch({ message: 'Invalid verification code' }, 401);
    await expect(verifyMfaChallenge({ mfaToken: 'm', code: '000000' })).rejects.toThrow(
      'Invalid verification code',
    );
  });
});

describe('recoverWithMfaRecoveryCode', () => {
  it('returns user + token + remainingRecoveryCodes', async () => {
    mockFetch({
      success: true,
      data: {
        user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'superadmin', createdAt: '', updatedAt: '' },
        tokens: { accessToken: 'jwt-r' },
        remainingRecoveryCodes: 7,
      },
    });

    const result = await recoverWithMfaRecoveryCode({ mfaToken: 'm', recoveryCode: 'XXXXX-YYYYY' });

    expect(result.tokens.accessToken).toBe('jwt-r');
    expect(result.remainingRecoveryCodes).toBe(7);
  });
});

describe('internal MFA endpoints', () => {
  it('getMfaStatus unwraps { success, data }', async () => {
    mockFetch({
      success: true,
      data: {
        enabled: true,
        enabledAt: '2026-01-01T00:00:00Z',
        remainingRecoveryCodes: 9,
        isRequiredForRole: true,
      },
    });

    const status = await getMfaStatus('token');
    expect(status.enabled).toBe(true);
    expect(status.remainingRecoveryCodes).toBe(9);
  });

  it('enrollMfa returns secret + otpauthUri', async () => {
    mockFetch({
      success: true,
      data: { secret: 'BASE32SECRET', otpauthUri: 'otpauth://totp/x' },
    });

    const secret = await enrollMfa('token');
    expect(secret.secret).toBe('BASE32SECRET');
    expect(secret.otpauthUri).toMatch(/^otpauth:\/\//);
  });

  it('verifyMfaEnrollment returns the (one-time) recovery codes', async () => {
    mockFetch({
      success: true,
      data: {
        enabled: true,
        recoveryCodes: Array.from({ length: 10 }, (_, i) => `CODE-${i}`),
        warning: 'Save these',
      },
    });

    const r = await verifyMfaEnrollment('token', '123456');
    expect(r.enabled).toBe(true);
    expect(r.recoveryCodes).toHaveLength(10);
  });

  it('disableMfa requires password + code', async () => {
    mockFetch({ success: true, data: { enabled: false } });
    const r = await disableMfa('token', { currentPassword: 'pw', code: '123456' });
    expect(r.enabled).toBe(false);

    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    const body = JSON.parse(lastCall?.[1].body as string);
    expect(body).toEqual({ currentPassword: 'pw', code: '123456' });
  });

  it('regenerateRecoveryCodes returns a fresh set', async () => {
    mockFetch({
      success: true,
      data: {
        recoveryCodes: ['NEW-1', 'NEW-2'],
        warning: 'Previous codes invalidated',
      },
    });

    const r = await regenerateRecoveryCodes('token', '654321');
    expect(r.recoveryCodes).toEqual(['NEW-1', 'NEW-2']);
  });
});
