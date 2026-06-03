import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly-changing value. Returns the latest value only
 * after `delayMs` has passed without any further changes — useful for
 * gating search inputs, where firing a network request on every
 * keystroke is wasteful.
 *
 * Example:
 *   const [raw, setRaw] = useState('');
 *   const debounced = useDebounce(raw, 300);
 *   // debounced lags raw by up to 300ms of typing pause
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
