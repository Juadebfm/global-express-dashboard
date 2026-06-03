/**
 * Centralised per-resource freshness windows for TanStack Query.
 *
 * `staleTime` controls how long React Query treats a cached query as fresh
 * — within that window, refocus / remount / re-render do NOT trigger a
 * refetch. Past it, the next access kicks off a background revalidation.
 *
 * Picking the right window matters because the alternative (default
 * `staleTime: 0`) means every tab refocus refetches every query — which
 * for a dashboard wired to dozens of GETs is wasteful + makes the UI
 * flicker. Tune up.
 *
 * Pick by **how fast the underlying data changes**, not by "how important
 * the page is". A settings page doesn't need re-fetching every 30s — its
 * values change once a quarter. An orders queue needs re-fetching
 * frequently — staff are creating + updating rows in parallel.
 */
export const STALE_TIME = {
  /**
   * Always treat the cache as stale. The next access refetches.
   * Use for: notifications inbox / unread count, anything that drives
   * an in-app real-time signal where freshness > fewer requests.
   */
  ALWAYS_FRESH: 0,
  /**
   * 30 seconds — refetch on refocus only after the window expires.
   * Use for: dashboard slices, list views, detail pages, reports,
   * support threads. The "things change but not constantly" default.
   */
  REAL_TIME: 30_000,
  /**
   * 5 minutes. Use for: editable settings (logistics, FX rate, pricing,
   * templates, restricted goods, packaging types), user preferences,
   * MFA status. Values change rarely but staff can edit them, so we
   * don't want to wait for a hard reload to see updates.
   */
  SLOW_MOVING: 5 * 60_000,
  /**
   * 30 minutes. Use for: public catalogs (shipment types, calculator
   * rates) that effectively never change inside a session.
   */
  STATIC: 30 * 60_000,
} as const;
