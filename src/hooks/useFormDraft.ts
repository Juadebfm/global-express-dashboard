import { useCallback, useEffect, useRef, useState } from 'react';

/** How long a saved draft stays usable before it is discarded on load. */
export const DRAFT_TTL_MS = 30 * 60 * 1000;

const SAVE_DEBOUNCE_MS = 500;

interface StoredDraft<T> {
  values: T;
  savedAt: number;
}

/**
 * Keeps a half-finished form on disk so a refresh, a stray back button or a
 * crash does not throw away everything the user typed.
 *
 * Drafts expire after 30 minutes and are cleared on submit, so nothing lingers
 * once it is either saved or stale. The key should include the signed-in user
 * so one person's draft can never surface for the next person on a shared
 * machine.
 *
 * Note this writes to localStorage, which survives a browser restart — do not
 * pass anything that would be unsafe to leave on the device.
 */
export function useFormDraft<T>(
  key: string | null,
  /** Called once on mount with a draft that is still within its lifetime. */
  onRestore: (values: T) => void,
): {
  save: (values: T) => void;
  clear: () => void;
  /** True when a draft was found and restored, so the UI can say so. */
  restored: boolean;
} {
  const [restored, setRestored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Held in a ref so a caller passing an inline function does not re-run the
  // restore on every render. Updated in an effect, never during render.
  const restoreRef = useRef(onRestore);
  useEffect(() => {
    restoreRef.current = onRestore;
  });

  const clear = useCallback((): void => {
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable — nothing to clean up */
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw) as StoredDraft<T>;
      if (!parsed || typeof parsed.savedAt !== 'number') {
        localStorage.removeItem(key);
        return;
      }
      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(key);
        return;
      }

      restoreRef.current(parsed.values);
      setRestored(true);
    } catch {
      // A corrupt draft must never block the form from opening.
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    // Restores once per key, on mount.
  }, [key]);

  const save = useCallback(
    (values: T): void => {
      if (!key) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify({ values, savedAt: Date.now() }));
        } catch {
          /* quota or private mode — losing the draft is better than throwing */
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [key],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { save, clear, restored };
}
