import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DRAFT_TTL_MS, useFormDraft } from './useFormDraft';

const KEY = 'gx_order_draft_user-1';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

function writeDraft(values: unknown, savedAt: number): void {
  localStorage.setItem(KEY, JSON.stringify({ values, savedAt }));
}

describe('useFormDraft', () => {
  it('restores a recent draft and reports that it did', () => {
    writeDraft({ description: 'Children clothes' }, Date.now());
    const onRestore = vi.fn();

    const { result } = renderHook(() => useFormDraft(KEY, onRestore));

    expect(onRestore).toHaveBeenCalledWith({ description: 'Children clothes' });
    expect(result.current.restored).toBe(true);
  });

  // Old drafts are worse than none — the user has moved on and would be
  // confused to find yesterday's answers.
  it('discards a draft past its lifetime', () => {
    writeDraft({ description: 'Stale' }, Date.now() - DRAFT_TTL_MS - 1);
    const onRestore = vi.fn();

    const { result } = renderHook(() => useFormDraft(KEY, onRestore));

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.restored).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('saves after a pause rather than on every keystroke', () => {
    const { result } = renderHook(() => useFormDraft(KEY, vi.fn()));

    act(() => {
      result.current.save({ description: 'a' });
      result.current.save({ description: 'ab' });
      result.current.save({ description: 'abc' });
    });
    expect(localStorage.getItem(KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { values: unknown };
    expect(stored.values).toEqual({ description: 'abc' });
  });

  it('clears the draft', () => {
    writeDraft({ description: 'Anything' }, Date.now());
    const { result } = renderHook(() => useFormDraft(KEY, vi.fn()));

    act(() => {
      result.current.clear();
    });

    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // A corrupt entry must never stop the form from opening.
  it('survives unparseable stored data', () => {
    localStorage.setItem(KEY, 'not json at all');
    const onRestore = vi.fn();

    const { result } = renderHook(() => useFormDraft(KEY, onRestore));

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.restored).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does nothing without a key, so a signed-out user writes no draft', () => {
    const onRestore = vi.fn();
    const { result } = renderHook(() => useFormDraft(null, onRestore));

    act(() => {
      result.current.save({ description: 'ignored' });
      vi.advanceTimersByTime(600);
    });

    expect(onRestore).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  // The key carries the user id, so one person's draft cannot reach the next
  // person signing in on the same machine.
  it('keeps drafts separate per key', () => {
    writeDraft({ description: 'Belongs to user 1' }, Date.now());
    const onRestore = vi.fn();

    renderHook(() => useFormDraft('gx_order_draft_user-2', onRestore));

    expect(onRestore).not.toHaveBeenCalled();
  });
});
