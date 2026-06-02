import { useEffect, useState } from 'react';
import { useCooldownStore } from '@/store';
import { ApiError } from '@/lib/apiClient';

interface RetryCooldown {
  isCoolingDown: boolean;
  remainingSeconds: number;
  /** MM:SS string when active; empty string otherwise. */
  label: string;
  /** Start a cooldown of `seconds` for this key. No-op if seconds<=0. */
  startCooldown: (seconds: number) => void;
  /**
   * Convenience: if `err` is a 429 ApiError with retryAfterSeconds, start a
   * cooldown for it. Safe to call with anything (non-429 / non-ApiError are
   * ignored), so this can sit unconditionally inside a mutation's onError.
   */
  startFromError: (err: unknown) => void;
}

/**
 * Per-button retry-after cooldown driven by the global cooldown store and a
 * 1-Hz local tick. Pass a stable string key — every consumer of the same key
 * shares the same countdown.
 *
 * Usage:
 *   const cooldown = useRetryCooldown('auth:login');
 *   useMutation({ onError: cooldown.startFromError });
 *   <Button disabled={cooldown.isCoolingDown}>
 *     {cooldown.isCoolingDown ? `Retry in ${cooldown.label}` : 'Submit'}
 *   </Button>
 */
export function useRetryCooldown(key: string): RetryCooldown {
  const endTime = useCooldownStore((s) => s.endTimes[key] ?? 0);
  const storeStart = useCooldownStore((s) => s.startCooldown);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (endTime <= Date.now()) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endTime]);

  const remainingSeconds = Math.max(0, Math.ceil((endTime - nowMs) / 1000));
  const isCoolingDown = remainingSeconds > 0;
  const label = isCoolingDown
    ? `${Math.floor(remainingSeconds / 60)
        .toString()
        .padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`
    : '';

  return {
    isCoolingDown,
    remainingSeconds,
    label,
    startCooldown: (seconds: number) => storeStart(key, seconds),
    startFromError: (err: unknown) => {
      if (
        err instanceof ApiError &&
        err.status === 429 &&
        err.retryAfterSeconds &&
        err.retryAfterSeconds > 0
      ) {
        storeStart(key, err.retryAfterSeconds);
      }
    },
  };
}
