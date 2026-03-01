import i18n from '@/i18n/i18n';

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
