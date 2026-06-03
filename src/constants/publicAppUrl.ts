/**
 * Origin used when generating user-facing share links (tracking page URLs,
 * verification mail links, etc.). Read in this order:
 *
 *   1. `VITE_PUBLIC_APP_URL` (e.g. `https://app.globalexpress.kr`)
 *      Set this on Vercel + in local `.env` so dev / preview / prod all
 *      hand out the same shareable tracking URL.
 *   2. `window.location.origin` as a fallback for environments where the
 *      env var hasn't been set — keeps the page functional but the link
 *      will point at wherever the page is loaded (e.g. `localhost:5173`).
 *
 * Trailing slashes are stripped so callers can safely template `${origin}${path}`.
 */
const RAW = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? '';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getPublicAppOrigin(): string {
  if (RAW.trim().length > 0) return stripTrailingSlash(RAW.trim());
  if (typeof window !== 'undefined' && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }
  return '';
}

/**
 * Build a public-facing URL by appending a path to the public origin.
 * Use this anywhere you need a link the user might share outside the app
 * (tracking pages, copy-to-clipboard buttons, email/WhatsApp/Kakao share).
 */
export function buildPublicAppUrl(path: string): string {
  const origin = getPublicAppOrigin();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
