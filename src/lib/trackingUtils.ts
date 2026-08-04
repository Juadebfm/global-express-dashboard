export function isInternalTracking(trackingNumber: string): boolean {
  return (
    trackingNumber.startsWith('TEMP-') ||
    trackingNumber.startsWith('GEX-')
  );
}

export function formatTrackingDisplay(trackingNumber: string): string {
  if (isInternalTracking(trackingNumber)) return 'Pending tracking no.';
  return trackingNumber;
}

/**
 * Customer batch references are `YYYYMMDD-XXXX`, where the suffix is four
 * random uppercase letters or digits (e.g. `20260727-P8SM`).
 */
export function isSlotTracking(trackingNumber: string): boolean {
  return /^\d{8}-[A-Z0-9]{4}$/.test(trackingNumber.trim().toUpperCase());
}
