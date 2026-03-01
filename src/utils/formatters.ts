import i18n from '@/i18n/i18n';

function getLocale(): string {
  return i18n.language === 'ko' ? 'ko-KR' : 'en-US';
}

export function formatDate(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null) return '0';
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
): string {
  if (value == null) return formatCurrency(0, currency);
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Safely extract a location string from API data.
 * The API sometimes returns a route object instead of a plain string:
 * { originCountry, originCity, destinationCountry, destinationCity, isLocked }
 */
export function resolveLocation(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const city = (obj.originCity ?? obj.destinationCity ?? '') as string;
    const country = (obj.originCountry ?? obj.destinationCountry ?? '') as string;
    if (city && country) return `${city}, ${country}`;
    return city || country || '';
  }
  return String(value ?? '');
}
