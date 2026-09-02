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
