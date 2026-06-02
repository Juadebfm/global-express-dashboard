import { describe, expect, it } from 'vitest';

import { isTurnstileError } from './turnstileHelpers';
import { ApiError } from '@/lib/apiClient';

describe('isTurnstileError', () => {
  it('matches 422 ApiError with "captcha" in the message', () => {
    const err = new ApiError('Captcha verification failed.', 422, null);
    expect(isTurnstileError(err)).toBe(true);
  });

  it('matches case-insensitively', () => {
    const err = new ApiError('CAPTCHA_MISSING', 422, null);
    expect(isTurnstileError(err)).toBe(true);
  });

  it('does NOT match non-422 errors even if captcha is mentioned', () => {
    expect(isTurnstileError(new ApiError('captcha service down', 500, null))).toBe(false);
    expect(isTurnstileError(new ApiError('captcha forbidden', 403, null))).toBe(false);
  });

  it('does NOT match 422 errors without "captcha" in the message', () => {
    expect(isTurnstileError(new ApiError('Profile incomplete', 422, null))).toBe(false);
  });

  it('does NOT match non-ApiError throwables', () => {
    expect(isTurnstileError(new Error('captcha failed'))).toBe(false);
    expect(isTurnstileError('captcha failed')).toBe(false);
    expect(isTurnstileError(null)).toBe(false);
    expect(isTurnstileError(undefined)).toBe(false);
  });
});
