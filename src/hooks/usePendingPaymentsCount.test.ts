import { describe, expect, it } from 'vitest';
import { canFetchPendingPaymentsCount } from './usePendingPaymentsCount';

describe('canFetchPendingPaymentsCount', () => {
  it('allows the all-payments badge only for superadmins', () => {
    expect(canFetchPendingPaymentsCount('superadmin')).toBe(true);
    expect(canFetchPendingPaymentsCount('staff')).toBe(false);
    expect(canFetchPendingPaymentsCount('admin')).toBe(false);
    expect(canFetchPendingPaymentsCount('user')).toBe(false);
    expect(canFetchPendingPaymentsCount(undefined)).toBe(false);
  });
});
