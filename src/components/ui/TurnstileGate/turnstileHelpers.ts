import { ApiError } from '@/lib/apiClient';

/**
 * Sentinel returned by the gate in dev-bypass mode (no
 * VITE_TURNSTILE_SITE_KEY set). The BE middleware short-circuits the same
 * way when its TURNSTILE_SECRET_KEY is unset.
 */
export const TURNSTILE_DEV_TOKEN = 'dev-skip';

/**
 * Returns true if `err` is a CAPTCHA-failure response. Form catch blocks
 * use this to know they should reset the gate.
 *
 * Once PR A (Problem Details parsing) merges, upgrade this to check
 * `err.problem?.type === '/problems/unprocessable'` AND
 * `err.problem?.code === 'captcha_failed' | 'captcha_missing'`. Until
 * then, the 422-with-"captcha"-in-message sniff is good enough — every
 * captcha rejection path returns 422 with one of those codes today.
 */
export function isTurnstileError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 422 && /captcha/i.test(err.message);
}
