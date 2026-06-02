import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiErrorsToForm } from './useApiErrorsToForm';
import { ApiError, PROBLEM_TYPE, type Problem } from '@/lib/apiClient';

function buildValidationError(errors: Problem['errors']): ApiError {
  const problem: Problem = {
    type: PROBLEM_TYPE.VALIDATION,
    title: 'Validation failed',
    status: 400,
    detail: 'One or more request fields failed validation.',
    instance: '/api/v1/payments/initialize',
    requestId: 'req-1',
    errors,
  };
  return new ApiError(problem.detail, problem.status, null, problem.requestId, problem);
}

describe('useApiErrorsToForm', () => {
  it('maps each errors[] entry to setError and returns the count', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm<{ amount: number; callbackUrl: string }>(setError));

    const count = result.current.apply(
      buildValidationError([
        { path: ['amount'], message: 'expected number', code: 'invalid_type' },
        { path: ['callbackUrl'], message: 'Required', code: 'invalid_type' },
      ]),
    );

    expect(count).toBe(2);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenNthCalledWith(1, 'amount', {
      type: 'invalid_type',
      message: 'expected number',
    });
    expect(setError).toHaveBeenNthCalledWith(2, 'callbackUrl', {
      type: 'invalid_type',
      message: 'Required',
    });
  });

  it('joins multi-segment numeric paths into dotted indices', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm(setError));

    result.current.apply(
      buildValidationError([
        { path: ['items', 0, 'qty'], message: 'min 1', code: 'too_small' },
      ]),
    );

    expect(setError).toHaveBeenCalledWith('items.0.qty', {
      type: 'too_small',
      message: 'min 1',
    });
  });

  it('also handles /problems/unprocessable with errors[]', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm(setError));
    const problem: Problem = {
      type: PROBLEM_TYPE.UNPROCESSABLE,
      title: 'Unprocessable',
      status: 422,
      detail: 'Callback URL not allowed.',
      instance: '/api/v1/payments/initialize',
      requestId: 'req-2',
      errors: [{ path: ['callbackUrl'], message: 'host not allowed' }],
    };
    const count = result.current.apply(
      new ApiError(problem.detail, 422, null, problem.requestId, problem),
    );
    expect(count).toBe(1);
    expect(setError).toHaveBeenCalledWith('callbackUrl', {
      type: 'server',
      message: 'host not allowed',
    });
  });

  it('returns 0 (does not call setError) for non-validation problems', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm(setError));
    const notFound: Problem = {
      type: PROBLEM_TYPE.NOT_FOUND,
      title: 'Not found',
      status: 404,
      detail: 'Resource missing',
      instance: '/api/v1/orders/x',
      requestId: 'req-3',
    };
    const count = result.current.apply(
      new ApiError('Not found', 404, null, 'req-3', notFound),
    );
    expect(count).toBe(0);
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns 0 for non-ApiError throwables (plain Error, string)', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm(setError));
    expect(result.current.apply(new Error('boom'))).toBe(0);
    expect(result.current.apply('boom')).toBe(0);
    expect(result.current.apply(undefined)).toBe(0);
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns 0 when problem.errors is missing or empty', () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useApiErrorsToForm(setError));
    expect(result.current.apply(buildValidationError([]))).toBe(0);
    expect(result.current.apply(buildValidationError(undefined))).toBe(0);
    expect(setError).not.toHaveBeenCalled();
  });
});
