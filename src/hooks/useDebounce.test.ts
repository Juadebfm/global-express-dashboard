import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('updates the debounced value only after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );
    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('cancels the pending update when the value changes again before the delay elapses', () => {
    // This is the actual point of the hook: rapid keystrokes should
    // produce ONE update, not one per keystroke.
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: '' } },
    );

    rerender({ value: 'a' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'al' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'ali' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'alic' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'alice' });

    // Still empty — every change reset the timer.
    expect(result.current).toBe('');

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('alice');
  });

  it('respects a different delay per call', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 1000 } },
    );

    rerender({ value: 'b', delay: 1000 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('b');
  });
});
