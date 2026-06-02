import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendOtp, verifyOtp, resetPassword } from './forgotPasswordService';

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

describe('forgotPasswordService', () => {
  it('sendOtp POSTs to /auth/forgot-password/send-otp and unwraps message', async () => {
    mockFetch({ success: true, data: { message: 'OTP sent' } });
    const r = await sendOtp('a@b.test');
    expect(r.message).toBe('OTP sent');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/auth/forgot-password/send-otp');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('verifyOtp unwraps message', async () => {
    mockFetch({ success: true, data: { message: 'OK' } });
    const r = await verifyOtp('a@b.test', '1234');
    expect(r.message).toBe('OK');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/auth/forgot-password/verify-otp');
  });

  it('resetPassword unwraps message', async () => {
    mockFetch({ success: true, data: { message: 'Password reset' } });
    const r = await resetPassword('a@b.test', 'newpw');
    expect(r.message).toBe('Password reset');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/auth/forgot-password/reset');
  });

  it('throws when the BE returns an error envelope', async () => {
    mockFetch({ message: 'Email not found' }, 404);
    await expect(sendOtp('x@y.test')).rejects.toThrow('Email not found');
  });
});
