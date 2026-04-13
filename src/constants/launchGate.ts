const DEFAULT_TARGET_UTC = Date.UTC(2026, 3, 18, 0, 0, 0); // Saturday, April 18, 2026 at 00:00 UTC

function parseBoolean(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function parseTarget(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_TARGET_UTC;
  }

  const asEpoch = Number(raw);
  if (Number.isFinite(asEpoch)) {
    return asEpoch;
  }

  const asDate = Date.parse(raw);
  return Number.isFinite(asDate) ? asDate : DEFAULT_TARGET_UTC;
}

// Env override:
// VITE_LAUNCH_GATE_ENABLED=true|false
// Default behavior: off in local dev, on in production build/deploy.
export const FORCE_LAUNCH_GATE = parseBoolean(import.meta.env.VITE_LAUNCH_GATE_ENABLED) ?? import.meta.env.PROD;

// Optional env override:
// VITE_LAUNCH_GATE_TARGET_UTC can be epoch ms or ISO date string.
export const LAUNCH_GATE_TARGET_UTC = parseTarget(import.meta.env.VITE_LAUNCH_GATE_TARGET_UTC);

export function isLaunchGateActive(): boolean {
  return FORCE_LAUNCH_GATE;
}
