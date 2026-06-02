import { describe, expect, it } from 'vitest';

import { isTurnstileError } from './turnstileHelpers';
import { ApiError, PROBLEM_TYPE, type Problem } from '@/lib/apiClient';

function buildProblemError(code: string, message = 'Captcha rejected.'): ApiError {
  const problem: Problem = {
    type: PROBLEM_TYPE.UNPROCESSABLE,
    title: 'Unprocessable',
    status: 422,
    detail: message,
    instance: '/api/v1/public/newsletter/subscribe',
    requestId: 'req-cf',
    code,
  };
  return new ApiError(message, 422, null, 'req-cf', problem);
}

describe('isTurnstileError', () => {
  describe('Problem Details path (preferred)', () => {
    it('matches problem.code === "captcha_failed"', () => {
      expect(isTurnstileError(buildProblemError('captcha_failed', 'rejected'))).toBe(true);
    });

    it('matches problem.code === "captcha_missing"', () => {
      expect(isTurnstileError(buildProblemError('captcha_missing', 'missing'))).toBe(true);
    });

    it('matches other captcha-shaped codes via a regex fallback', () => {
      expect(isTurnstileError(buildProblemError('captcha_expired', 'expired'))).toBe(true);
    });

    it('does NOT match non-captcha codes even on 422', () => {
      expect(isTurnstileError(buildProblemError('profile_incomplete', 'incomplete'))).toBe(false);
    });
  });

  describe('legacy message-sniff path', () => {
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
  });

  it('does NOT match non-ApiError throwables', () => {
    expect(isTurnstileError(new Error('captcha failed'))).toBe(false);
    expect(isTurnstileError('captcha failed')).toBe(false);
    expect(isTurnstileError(null)).toBe(false);
    expect(isTurnstileError(undefined)).toBe(false);
  });
});
