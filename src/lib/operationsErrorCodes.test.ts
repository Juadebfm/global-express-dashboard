import { describe, expect, it } from 'vitest';
import {
  describeOperationsError,
  getAffectedParcels,
  getOperationsErrorCode,
  isOperationsErrorCode,
  OPERATIONS_ERROR_CODES,
} from './operationsErrorCodes';
import { ApiError } from './apiClient';

function problemError(
  status: number,
  code: string | undefined,
  extras: Record<string, unknown> = {},
): ApiError {
  return new ApiError('Backend sentence', status, null, 'req-42', {
    type: '/problems/bad-request',
    title: 'Bad Request',
    status,
    detail: 'Backend sentence',
    instance: '/api/v1/orders/x',
    requestId: 'req-42',
    ...(code ? { code } : {}),
    ...extras,
  });
}

describe('getOperationsErrorCode', () => {
  it('reads a known code', () => {
    expect(getOperationsErrorCode(problemError(409, 'ORDER_ALREADY_IN_BATCH'))).toBe(
      'ORDER_ALREADY_IN_BATCH',
    );
  });

  // An unrecognised code must not be trusted as one of ours.
  it('returns null for an unknown code, a missing code, or a plain error', () => {
    expect(getOperationsErrorCode(problemError(400, 'SOMETHING_NEW'))).toBeNull();
    expect(getOperationsErrorCode(problemError(400, undefined))).toBeNull();
    expect(getOperationsErrorCode(new Error('boom'))).toBeNull();
    expect(getOperationsErrorCode(null)).toBeNull();
  });
});

describe('isOperationsErrorCode', () => {
  // This replaced matching the backend's English sentence, which broke as soon
  // as that copy was reworded or translated.
  it('identifies the already-in-a-batch case without reading the sentence', () => {
    const error = problemError(409, 'ORDER_ALREADY_IN_BATCH');
    expect(isOperationsErrorCode(error, 'ORDER_ALREADY_IN_BATCH')).toBe(true);
    expect(isOperationsErrorCode(error, 'ORDER_NOT_VERIFIED_FOR_BATCH')).toBe(false);
  });

  it('is unaffected by the wording of detail', () => {
    const reworded = new ApiError('Completely different wording', 409, null, 'req-1', {
      type: '/problems/conflict',
      title: 'Conflict',
      status: 409,
      detail: 'Completely different wording',
      instance: '/x',
      requestId: 'req-1',
      code: 'ORDER_ALREADY_IN_BATCH',
    });
    expect(isOperationsErrorCode(reworded, 'ORDER_ALREADY_IN_BATCH')).toBe(true);
  });
});

describe('getAffectedParcels', () => {
  it('reads the parcel numbers off a measurement failure', () => {
    expect(
      getAffectedParcels(problemError(400, 'PARCEL_MEASUREMENTS_INCOMPLETE', { parcels: [2, 3] })),
    ).toEqual([2, 3]);
  });

  it('returns an empty list when none are attached', () => {
    expect(getAffectedParcels(problemError(400, 'NO_PARCELS_SUBMITTED'))).toEqual([]);
    expect(getAffectedParcels(new Error('boom'))).toEqual([]);
  });
});

describe('describeOperationsError', () => {
  // Our own copy, so it can be translated without the backend's sentence
  // leaking through.
  it('names the affected parcels, numbered from 1 as staff see them', () => {
    const message = describeOperationsError(
      problemError(400, 'PARCEL_MEASUREMENTS_INCOMPLETE', { parcels: [2, 3] }),
    );
    expect(message).toBe('Enter the weight and all three sizes for parcels 2 and 3.');
  });

  it('reads naturally for a single parcel', () => {
    const message = describeOperationsError(
      problemError(400, 'PARCEL_MEASUREMENTS_INCOMPLETE', { parcels: [2] }),
    );
    expect(message).toBe('Enter the weight and all three sizes for parcel 2.');
  });

  it('falls back to a general sentence when no parcels are named', () => {
    expect(describeOperationsError(problemError(400, 'PARCEL_MEASUREMENTS_INCOMPLETE'))).toBe(
      'Enter the weight and all three sizes for every parcel.',
    );
  });

  // Returning null lets the caller fall back to the backend's detail, which is
  // the documented behaviour for anything we do not recognise.
  it('returns null for an unknown code', () => {
    expect(describeOperationsError(problemError(400, 'SOMETHING_NEW'))).toBeNull();
    expect(describeOperationsError(new Error('boom'))).toBeNull();
  });

  it('has wording for every code in this release', () => {
    for (const code of OPERATIONS_ERROR_CODES) {
      expect(describeOperationsError(problemError(400, code))).toBeTruthy();
    }
  });
});
