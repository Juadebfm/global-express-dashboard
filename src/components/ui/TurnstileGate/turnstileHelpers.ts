import { ApiError, PROBLEM_TYPE } from '@/lib/apiClient';

/**
 * Sentinel returned by the gate in dev-bypass mode (no
 * VITE_TURNSTILE_SITE_KEY set). The BE middleware short-circuits the same
 * way when its TURNSTILE_SECRET_KEY is unset.
 */
export const TURNSTILE_DEV_TOKEN = 'dev-bypass-token';

/**
 * Returns true if `err` is a CAPTCHA-failure response. Form catch blocks
 * use this to know they should reset the gate.
 *
 * Primary path (post-PR-A): the BE returns RFC 7807
 * `/problems/unprocessable` with `code: "captcha_failed"` or
 * `"captcha_missing"` at the top level.
 *
 * Fallback: message-string sniff on a 422 — kept so any endpoint that
 * hasn't migrated to the Problem Details shape still works. The two paths
 * can both fire; the function answers "is this a captcha rejection?"
 * regardless of which envelope the BE used.
 */
export function isTurnstileError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status !== 422) return false;

  const code = err.problem?.code;
  if (code === 'captcha_failed' || code === 'captcha_missing') return true;

  if (err.problem?.type === PROBLEM_TYPE.UNPROCESSABLE && typeof code === 'string') {
    // Some BE deployments might tag captcha failures with a different code
    // string; the message still mentions captcha in those cases.
    if (/captcha/i.test(code)) return true;
  }

  // Pre-Problem-Details fallback (or any 422 without an extension `code`):
  // sniff the human-readable message.
  return /captcha/i.test(err.message);
}
