import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useRetryCooldown } from './useRetryCooldown';
import { useCooldownStore } from '@/store';
import { ApiError } from '@/lib/apiClient';

beforeEach(() => {
  vi.useFakeTimers();
  // Reset the store between tests so cooldowns don't leak.
  useCooldownStore.setState({ endTimes: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRetryCooldown', () => {
  it('starts idle when no cooldown is set', () => {
    const { result } = renderHook(() => useRetryCooldown('test:idle'));
    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.label).toBe('');
  });

  it('counts down once startCooldown is called', () => {
    const { result } = renderHook(() => useRetryCooldown('test:tick'));
    act(() => {
      result.current.startCooldown(5);
    });
    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(4);
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(5);
    expect(result.current.label).toMatch(/^00:0[45]$/);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(1);
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.label).toBe('');
  });

  it('startFromError only fires for 429 ApiError with positive retryAfterSeconds', () => {
    const { result } = renderHook(() => useRetryCooldown('test:err'));

    act(() => {
      result.current.startFromError(new ApiError('msg', 429, 10));
    });
    expect(result.current.isCoolingDown).toBe(true);

    // Reset
    act(() => {
      useCooldownStore.setState({ endTimes: {} });
    });
    expect(result.current.isCoolingDown).toBe(false);

    // Non-ApiError: ignored.
    act(() => {
      result.current.startFromError(new Error('plain'));
    });
    expect(result.current.isCoolingDown).toBe(false);

    // Wrong status: ignored.
    act(() => {
      result.current.startFromError(new ApiError('msg', 503, 10));
    });
    expect(result.current.isCoolingDown).toBe(false);

    // Null retryAfter: ignored.
    act(() => {
      result.current.startFromError(new ApiError('msg', 429, null));
    });
    expect(result.current.isCoolingDown).toBe(false);
  });

  it('shares cooldown across hooks with the same key', () => {
    const a = renderHook(() => useRetryCooldown('shared:key'));
    const b = renderHook(() => useRetryCooldown('shared:key'));

    act(() => {
      a.result.current.startCooldown(7);
    });

    expect(a.result.current.isCoolingDown).toBe(true);
    expect(b.result.current.isCoolingDown).toBe(true);
    expect(b.result.current.remainingSeconds).toBe(a.result.current.remainingSeconds);
  });

  it('isolates cooldowns by key', () => {
    const a = renderHook(() => useRetryCooldown('iso:a'));
    const b = renderHook(() => useRetryCooldown('iso:b'));

    act(() => {
      a.result.current.startCooldown(5);
    });

    expect(a.result.current.isCoolingDown).toBe(true);
    expect(b.result.current.isCoolingDown).toBe(false);
  });
});
