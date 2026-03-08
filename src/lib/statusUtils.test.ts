import { describe, expect, it } from 'vitest';

import { STATUS_FILTER_OPTIONS, getStatusCategory, getStatusStyle } from './statusUtils';

describe('getStatusCategory', () => {
  it('maps known statuses to the expected categories', () => {
    expect(getStatusCategory('PREORDER_SUBMITTED')).toBe('pending');
    expect(getStatusCategory('READY_FOR_PICKUP')).toBe('active');
    expect(getStatusCategory('PICKED_UP_COMPLETED')).toBe('completed');
    expect(getStatusCategory('ON_HOLD')).toBe('exception');
  });

  it('defaults unknown statuses to pending', () => {
    expect(getStatusCategory('UNKNOWN_STATUS')).toBe('pending');
  });
});

describe('getStatusStyle', () => {
  it('returns style classes for mapped status categories', () => {
    expect(getStatusStyle('PICKED_UP_COMPLETED')).toMatchObject({
      category: 'completed',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500',
    });
  });
});

describe('STATUS_FILTER_OPTIONS', () => {
  it('keeps all expected top-level filter tabs', () => {
    expect(STATUS_FILTER_OPTIONS.map((option) => option.id)).toEqual([
      'all',
      'pending',
      'active',
      'completed',
      'exception',
    ]);
  });
});

