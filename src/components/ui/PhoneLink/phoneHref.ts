export function phoneHref(phone: string): string {
  return `tel:${phone.trim().replace(/[^\d+]/g, '')}`;
}
