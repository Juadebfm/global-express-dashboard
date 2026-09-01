import { describe, expect, it } from 'vitest';
import {
  paidAmountLabel,
  paymentStatusDisplay,
  usdLabel,
  verifiedWeightLabel,
} from './rosterDisplay';

describe('batch roster display values', () => {
  it('labels an unverified order without treating it as zero weight', () => {
    expect(verifiedWeightLabel(null)).toBe('Pending verification');
    expect(verifiedWeightLabel('108.000')).toBe('108.000 kg');
  });

  it('uses the final shipping charge and never displays a missing paid value as zero', () => {
    expect(usdLabel('3208.50')).toBe('$3,208.50');
    expect(paidAmountLabel(null)).toBe('Needs finance review');
  });

  it('renders the backend payment state as display-only status text', () => {
    expect(paymentStatusDisplay('UNPAID').label).toBe('Unpaid');
    expect(paymentStatusDisplay('PAYMENT_IN_PROGRESS').label).toBe('Payment pending');
    expect(paymentStatusDisplay('PAID_IN_FULL').label).toBe('Paid in full');
  });
});
