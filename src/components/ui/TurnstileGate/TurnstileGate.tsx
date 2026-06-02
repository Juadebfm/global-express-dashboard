import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { TURNSTILE_DEV_TOKEN } from './turnstileHelpers';

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';

// Dev-mode bypass: when the site key is unset (local dev, CI without
// Turnstile creds), the gate skips rendering the widget and immediately
// reports a sentinel token. The BE middleware short-circuits the same way
// when its TURNSTILE_SECRET_KEY is unset, so this round-trips end-to-end
// in local dev with zero setup.
const IS_DEV_BYPASS = SITE_KEY === '';

export interface TurnstileGateRef {
  /**
   * Clears the captured token + asks the widget for a fresh one. Call this
   * from the form's catch block when the server returns a 422 with
   * `code: "captcha_failed"` or `"captcha_missing"` — Turnstile tokens are
   * single-use and expire after 5 minutes.
   */
  reset: () => void;
  /** Returns the currently captured token, or null if none yet. */
  getToken: () => string | null;
  /**
   * Returns a promise that resolves with a fresh token. The first call
   * resolves immediately with the currently captured token (if any). Each
   * subsequent call resets the widget and awaits the next `onSuccess`. Use
   * this for flows that fire multiple protected POSTs in sequence (e.g. the
   * anonymous claim flow: N presigns + 1 submit, each consuming a single-use
   * token). In dev-bypass mode, always resolves with the sentinel.
   */
  requestNextToken: () => Promise<string>;
}

export interface TurnstileGateProps {
  /** Called whenever the widget hands the form a fresh token. */
  onToken: (token: string) => void;
  /** Called when the widget reports an error (network, render, etc.). */
  onError?: () => void;
  /** Called when the captured token expires (5 minutes after capture). */
  onExpire?: () => void;
  /** Light or dark variant of the widget. Defaults to `light`. */
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Renders the Cloudflare Turnstile widget on the 5 unauthenticated public
 * POST forms (newsletter subscribe, gallery claim presign/submit, car
 * purchase attempt, D2D intake). Captures the token, hands it to the form
 * via `onToken`, and exposes `reset()` so the form can re-issue after a
 * server-side CAPTCHA rejection.
 *
 * Site key is read from VITE_TURNSTILE_SITE_KEY at module load. When unset,
 * the gate enters dev-bypass mode — see [TURNSTILE_DEV_TOKEN].
 */
export const TurnstileGate = forwardRef<TurnstileGateRef, TurnstileGateProps>(
  function TurnstileGate(
    { onToken, onError, onExpire, theme = 'light', className },
    ref,
  ) {
    const widgetRef = useRef<TurnstileInstance | null>(null);
    const [devToken, setDevToken] = useState<string | null>(
      IS_DEV_BYPASS ? TURNSTILE_DEV_TOKEN : null,
    );
    const [liveToken, setLiveToken] = useState<string | null>(null);
    // Queue of pending `requestNextToken` callers — resolved FIFO by the
    // next `onSuccess`. Stored in a ref so it survives re-renders without
    // re-triggering the imperative handle build.
    const pendingResolversRef = useRef<((token: string) => void)[]>([]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (IS_DEV_BYPASS) {
            setDevToken(TURNSTILE_DEV_TOKEN);
            onToken(TURNSTILE_DEV_TOKEN);
            return;
          }
          setLiveToken(null);
          widgetRef.current?.reset();
        },
        getToken: () => (IS_DEV_BYPASS ? devToken : liveToken),
        requestNextToken: () => {
          if (IS_DEV_BYPASS) return Promise.resolve(TURNSTILE_DEV_TOKEN);
          return new Promise<string>((resolve) => {
            pendingResolversRef.current.push(resolve);
            // If a token is already captured AND no other resolvers are queued
            // ahead, this caller can take the existing token immediately. The
            // widget then resets for the next call.
            if (liveToken && pendingResolversRef.current.length === 1) {
              const t = liveToken;
              pendingResolversRef.current.shift()?.(t);
              setLiveToken(null);
              widgetRef.current?.reset();
              return;
            }
            // Otherwise (no token yet, or someone else is already waiting),
            // sit in the queue. The next onSuccess drains the head.
            widgetRef.current?.reset();
          });
        },
      }),
      [devToken, liveToken, onToken],
    );

    if (IS_DEV_BYPASS) {
      // Don't render anything in dev. Emit the sentinel once on mount via
      // the parent's onToken (handled below in a useEffect-equivalent —
      // we just call onToken inline since the value is stable).
      if (devToken && devToken === TURNSTILE_DEV_TOKEN) {
        // Schedule onToken after render so React doesn't warn about setting
        // parent state mid-render.
        queueMicrotask(() => onToken(TURNSTILE_DEV_TOKEN));
      }
      return (
        <p className="text-xs text-gray-400" data-testid="turnstile-dev-bypass">
          Turnstile bypassed (no site key set)
        </p>
      );
    }

    return (
      <div className={className}>
        <Turnstile
          ref={widgetRef}
          siteKey={SITE_KEY}
          options={{ theme }}
          onSuccess={(token) => {
            // If any caller is awaiting a fresh token, drain the FIFO head
            // first — they get the token AND we reset to keep the queue moving.
            const resolver = pendingResolversRef.current.shift();
            if (resolver) {
              resolver(token);
              if (pendingResolversRef.current.length > 0) {
                widgetRef.current?.reset();
                return;
              }
              // No more waiters — fall through so the form sees the token too
              // (if the resolver took it, the form's onToken still fires below
              // so the submit button stays enabled).
            }
            setLiveToken(token);
            onToken(token);
          }}
          onError={() => {
            setLiveToken(null);
            onError?.();
          }}
          onExpire={() => {
            setLiveToken(null);
            onExpire?.();
          }}
        />
      </div>
    );
  },
);
