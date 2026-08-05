import { describe, expect, it } from 'vitest';
import {
  EMPTY_PARCEL,
  findInvalidMeasurement,
  hasAnyMeasurement,
  toParcelPayload,
} from './parcelDraft';

describe('toParcelPayload', () => {
  // The field is omitted entirely rather than sent as an empty list, since a
  // customer who filled nothing in has declared nothing.
  it('returns undefined when nothing was entered', () => {
    expect(toParcelPayload([{ ...EMPTY_PARCEL }])).toBeUndefined();
    expect(toParcelPayload([])).toBeUndefined();
  });

  it('converts filled measurements to numbers', () => {
    expect(
      toParcelPayload([{ lengthCm: '40', widthCm: '30', heightCm: '25', weightKg: '12.5' }]),
    ).toEqual([{ lengthCm: 40, widthCm: 30, heightCm: 25, weightKg: 12.5 }]);
  });

  // Every measurement is optional on its own; only the parcel needs one.
  it('keeps a parcel with a single measurement', () => {
    expect(toParcelPayload([{ ...EMPTY_PARCEL, weightKg: '12.5' }])).toEqual([
      { weightKg: 12.5 },
    ]);
  });

  it('drops empty rows but keeps the filled ones', () => {
    const result = toParcelPayload([
      { ...EMPTY_PARCEL, lengthCm: '40' },
      { ...EMPTY_PARCEL },
      { ...EMPTY_PARCEL, weightKg: '3' },
    ]);
    expect(result).toEqual([{ lengthCm: 40 }, { weightKg: 3 }]);
  });
});

describe('findInvalidMeasurement', () => {
  it('accepts empty and positive values', () => {
    expect(findInvalidMeasurement([{ ...EMPTY_PARCEL }])).toBeNull();
    expect(findInvalidMeasurement([{ ...EMPTY_PARCEL, lengthCm: '0.5' }])).toBeNull();
  });

  // The API requires every supplied number to be above zero.
  it('rejects zero and negatives, naming the parcel and field', () => {
    expect(findInvalidMeasurement([{ ...EMPTY_PARCEL, lengthCm: '0' }])).toMatch(
      /Parcel 1: length/i,
    );
    expect(
      findInvalidMeasurement([{ ...EMPTY_PARCEL }, { ...EMPTY_PARCEL, weightKg: '-2' }]),
    ).toMatch(/Parcel 2: weight/i);
  });

  it('rejects text that is not a number', () => {
    expect(findInvalidMeasurement([{ ...EMPTY_PARCEL, widthCm: 'abc' }])).toMatch(/width/i);
  });
});

describe('hasAnyMeasurement', () => {
  it('treats whitespace as empty', () => {
    expect(hasAnyMeasurement({ ...EMPTY_PARCEL, lengthCm: '   ' })).toBe(false);
    expect(hasAnyMeasurement({ ...EMPTY_PARCEL, lengthCm: '40' })).toBe(true);
  });
});
