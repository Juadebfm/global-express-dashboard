/**
 * Dashboard cards share a fixed-width grid, so monetary totals need a stable,
 * short form. The reports page remains the place for the full accounting value.
 */
export function formatCompactNaira(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `₦${new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount)}`;
}
