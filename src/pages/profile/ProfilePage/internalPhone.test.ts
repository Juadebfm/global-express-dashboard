import { describe, expect, it } from 'vitest';
import type { PhoneCountryOption } from './internalPhone';
import { buildE164, findPhoneCountry, getLocalPhoneValue, isPossibleE164 } from './internalPhone';

const countries: PhoneCountryOption[] = [
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
];

describe('staff phone formatting', () => {
  it('converts a Nigerian local number to E.164', () => {
    expect(buildE164('07040910513', countries[0])).toBe('+2347040910513');
    expect(isPossibleE164('07040910513', countries[0])).toBe(true);
  });

  it('keeps an existing E.164 number and displays its local digits', () => {
    const selected = findPhoneCountry('+2348012345678', countries, 'NG');
    expect(selected.code).toBe('NG');
    expect(getLocalPhoneValue('+2348012345678', selected)).toBe('8012345678');
    expect(buildE164('8012345678', selected)).toBe('+2348012345678');
  });

  it('uses the profile-country fallback for a legacy local value', () => {
    const selected = findPhoneCountry('07040910513', countries, 'NG');
    expect(selected.code).toBe('NG');
    expect(buildE164('07040910513', selected)).toBe('+2347040910513');
  });
});
