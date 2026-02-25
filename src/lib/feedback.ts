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
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource is not available.';
  if (status === 422) return 'Some details are invalid. Please review and try again.';
  if (status >= 500) return 'Service is temporarily unavailable. Please try again shortly.';
  return 'Something went wrong. Please try again.';
}

export function getDisplayErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return sanitizeMessage(error.message, fallback);
  if (typeof error === 'string') return sanitizeMessage(error, fallback);
  return fallback;
}
