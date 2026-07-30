import type { Country } from 'react-phone-number-input';
import { isPossiblePhoneNumber } from 'react-phone-number-input';

export interface PhoneCountryOption {
  code: Country;
  name: string;
  dialCode: string;
}

function digitsOnly(value: string | null | undefined): string {
  return value?.replace(/\D/g, '') ?? '';
}

function dialDigits(country: PhoneCountryOption): string {
  return digitsOnly(country.dialCode);
}

export function findPhoneCountry(
  value: string | null | undefined,
  countries: readonly PhoneCountryOption[],
  fallbackCode: Country,
): PhoneCountryOption {
  const digits = digitsOnly(value);
  const matched = countries
    .filter((country) => digits.startsWith(dialDigits(country)))
    .sort((a, b) => dialDigits(b).length - dialDigits(a).length)[0];

  return matched ?? countries.find((country) => country.code === fallbackCode) ?? countries[0];
}

export function getLocalPhoneValue(
  value: string | null | undefined,
  country: PhoneCountryOption,
): string {
  const digits = digitsOnly(value);
  if (!digits) return '';

  const dialCode = dialDigits(country);
  return digits.startsWith(dialCode) ? digits.slice(dialCode.length) : digits;
}

export function buildE164(value: string, country: PhoneCountryOption): string {
  const digits = digitsOnly(value).replace(/^0+/, '');
  if (!digits) return '';

  const dialCode = dialDigits(country);
  return digits.startsWith(dialCode) ? `+${digits}` : `${country.dialCode}${digits}`;
}

export function isPossibleE164(value: string, country: PhoneCountryOption): boolean {
  const formatted = buildE164(value, country);
  return formatted.length > 0 && isPossiblePhoneNumber(formatted);
}
