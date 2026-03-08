import { describe, expect, it } from 'vitest';

import { getDisplayErrorMessage, sanitizeMessage } from './feedback';

describe('sanitizeMessage', () => {
  it('returns fallback for empty values', () => {
    expect(sanitizeMessage('', 'Fallback message')).toBe('Fallback message');
    expect(sanitizeMessage(undefined, 'Fallback message')).toBe('Fallback message');
    expect(sanitizeMessage(null, 'Fallback message')).toBe('Fallback message');
  });

  it('returns fallback for sensitive messages', () => {
    expect(sanitizeMessage('SQL syntax error near id', 'Fallback message')).toBe('Fallback message');
    expect(sanitizeMessage('/api/private/route is not reachable', 'Fallback message')).toBe('Fallback message');
  });

  it('keeps safe user-facing messages', () => {
    expect(sanitizeMessage('Shipment is not yet ready for pickup', 'Fallback message')).toBe(
      'Shipment is not yet ready for pickup'
    );
  });
});

describe('getDisplayErrorMessage', () => {
  it('sanitizes Error instances', () => {
    expect(getDisplayErrorMessage(new Error('stack trace leaked'), 'Fallback message')).toBe('Fallback message');
    expect(getDisplayErrorMessage(new Error('Please try again later'), 'Fallback message')).toBe(
      'Please try again later'
    );
  });

  it('handles string and unknown values', () => {
    expect(getDisplayErrorMessage('internal exception', 'Fallback message')).toBe('Fallback message');
    expect(getDisplayErrorMessage({ message: 'Not used' }, 'Fallback message')).toBe('Fallback message');
  });
});

