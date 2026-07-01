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

export function isSlotTracking(trackingNumber: string): boolean {
  return /^\d{8}-\d{4}$/.test(trackingNumber);
}
