import { describe, expect, it } from 'vitest';
import { formatCompactNaira } from './kpiFormat';

describe('formatCompactNaira', () => {
  it('keeps dashboard-scale revenue within a metric card', () => {
    expect(formatCompactNaira(40_572_462)).toBe('₦40.6M');
  });

  it('continues to use a short form for billion-naira totals', () => {
    expect(formatCompactNaira(1_205_000_000)).toBe('₦1.2B');
  });
});
