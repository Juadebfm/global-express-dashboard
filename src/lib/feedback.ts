import i18n from '@/i18n/i18n';
import { ApiError } from '@/lib/apiClient';
import type { PushFeedbackInput } from '@/store/feedback/feedback.types';

const SENSITIVE_PATTERNS = [
  /\/api\//i,
  /\broute\b/i,
  /\bstack\b/i,
  /\btrace\b/i,
  /\bexception\b/i,
  /\bsql\b/i,
  /\bsyntax error\b/i,
  /\binternal\b/i,
  /\bundefined\b/i,
];

function isSensitiveMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return true;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function sanitizeMessage(rawMessage: string | null | undefined, fallback: string): string {
  if (!rawMessage) return fallback;
  const normalized = rawMessage.trim();
  if (!normalized || isSensitiveMessage(normalized)) return fallback;
  return normalized;
}

export function getHttpFallbackMessage(status: number): string {
  const t = (key: string) => i18n.t(key, { ns: 'common' }) as string;

  if (status === 401) return t('feedback.sessionExpired');
  if (status === 403) return t('feedback.forbidden');
  if (status === 404) return t('feedback.notFound');
  if (status === 429) return t('feedback.rateLimited');
  if (status === 422) return t('feedback.invalidDetails');
  if (status >= 500) return t('feedback.unavailable');
  return t('feedback.unexpectedError');
}

export function getDisplayErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return sanitizeMessage(error.message, fallback);
  if (typeof error === 'string') return sanitizeMessage(error, fallback);
  return fallback;
}

/**
 * Returns true when re-firing the original mutation is the right next
 * step. Today: ApiError with HTTP 500 or 503 (the BE problem types
 * `/problems/internal` and `/problems/service-unavailable`). 502/504
 * also pass — proxies in front of the BE return those on transient
 * failures and the BE response shape may not be wrapped.
 *
 * 4xx is deliberately excluded — those mean the user's input or
 * authorisation needs to change, not the connection.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status >= 500 && error.status < 600;
}

/**
 * Build a {@link PushFeedbackInput} for a mutation failure. Centralises
 * the rules around (a) which errors get a Retry button, (b) how to
 * extract the user-facing message + requestId, (c) the sanitisation
 * gate. Call sites just pass the error, a fallback message, and a
 * retry callback — this helper picks whether to surface the retry.
 *
 *   onError: (err, vars) => pushMessage(buildErrorFeedback({
 *     err,
 *     fallbackMessage: FEEDBACK_MESSAGES.orders.createError,
 *     retry: () => m.mutate(vars),
 *   })),
 */
export function buildErrorFeedback({
  err,
  fallbackMessage,
  retry,
}: {
  err: unknown;
  fallbackMessage: string;
  retry?: () => void;
}): PushFeedbackInput {
  const message =
    err instanceof Error
      ? sanitizeMessage(err.message, fallbackMessage)
      : fallbackMessage;
  const referenceId =
    err instanceof ApiError ? err.requestId ?? undefined : undefined;
  return {
    tone: 'error',
    message,
    referenceId,
    retry: retry && isTransientError(err) ? retry : undefined,
  };
}
