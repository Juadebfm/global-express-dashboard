import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './apiClient';
import {
  buildErrorFeedback,
  getDisplayErrorMessage,
  isTransientError,
  sanitizeMessage,
} from './feedback';

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

describe('isTransientError', () => {
  it('returns true for ApiError with 5xx status', () => {
    expect(isTransientError(new ApiError('boom', 500, null))).toBe(true);
    expect(isTransientError(new ApiError('boom', 502, null))).toBe(true);
    expect(isTransientError(new ApiError('boom', 503, null))).toBe(true);
    expect(isTransientError(new ApiError('boom', 599, null))).toBe(true);
  });

  it('returns false for ApiError with 4xx status', () => {
    expect(isTransientError(new ApiError('bad request', 400, null))).toBe(false);
    expect(isTransientError(new ApiError('unauthorized', 401, null))).toBe(false);
    expect(isTransientError(new ApiError('not found', 404, null))).toBe(false);
    expect(isTransientError(new ApiError('rate limited', 429, null))).toBe(false);
  });

  it('returns false for non-ApiError values', () => {
    expect(isTransientError(new Error('network failure'))).toBe(false);
    expect(isTransientError('something broke')).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});

describe('buildErrorFeedback', () => {
  it('attaches the retry callback only when the error is transient (5xx)', () => {
    const retry = vi.fn();
    const feedback = buildErrorFeedback({
      err: new ApiError('downstream gone', 503, null),
      fallbackMessage: 'Try again later',
      retry,
    });
    expect(feedback.tone).toBe('error');
    expect(feedback.retry).toBe(retry);
  });

  it('omits the retry callback for 4xx errors', () => {
    const retry = vi.fn();
    const feedback = buildErrorFeedback({
      err: new ApiError('Invalid email', 400, null),
      fallbackMessage: 'Fallback',
      retry,
    });
    expect(feedback.retry).toBeUndefined();
  });

  it('omits the retry callback for non-ApiError values', () => {
    const retry = vi.fn();
    const feedback = buildErrorFeedback({
      err: new Error('Network failed'),
      fallbackMessage: 'Fallback',
      retry,
    });
    expect(feedback.retry).toBeUndefined();
  });

  it('passes through the requestId for support correlation', () => {
    const feedback = buildErrorFeedback({
      err: new ApiError('boom', 500, null, 'req-42'),
      fallbackMessage: 'Fallback',
    });
    expect(feedback.referenceId).toBe('req-42');
  });

  it('falls back when the server message is sensitive', () => {
    const feedback = buildErrorFeedback({
      err: new ApiError('SQL syntax error', 500, null),
      fallbackMessage: 'Service unavailable',
    });
    expect(feedback.message).toBe('Service unavailable');
  });
});

