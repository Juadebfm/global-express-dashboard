const DEFAULT_PROVISIONING_TARGET_UTC = Date.UTC(2026, 3, 20, 0, 0, 0); // Monday, April 20, 2026 at 00:00 UTC

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
    return DEFAULT_PROVISIONING_TARGET_UTC;
  }

  const asEpoch = Number(raw);
  if (Number.isFinite(asEpoch)) {
    return asEpoch;
  }

  const asDate = Date.parse(raw);
  return Number.isFinite(asDate) ? asDate : DEFAULT_PROVISIONING_TARGET_UTC;
}

export const PROVISIONING_GATE_BLOCK_MESSAGE =
  'Application Propagation Not Completed, Please wait for 48 - 36hours';

// Env override:
// VITE_PROVISIONING_GATE_ENABLED=true|false
// Default behavior: off in all environments unless explicitly enabled.
export const FORCE_PROVISIONING_GATE =
  parseBoolean(import.meta.env.VITE_PROVISIONING_GATE_ENABLED) ?? false;

// Optional env override:
// VITE_PROVISIONING_GATE_TARGET_UTC can be epoch ms or ISO date string.
export const PROVISIONING_GATE_TARGET_UTC = parseTarget(import.meta.env.VITE_PROVISIONING_GATE_TARGET_UTC);

export function getProvisioningRemainingMs(): number {
  return Math.max(0, PROVISIONING_GATE_TARGET_UTC - Date.now());
}

export function formatProvisioningCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function isProvisioningGateActive(): boolean {
  return FORCE_PROVISIONING_GATE && getProvisioningRemainingMs() > 0;
}
