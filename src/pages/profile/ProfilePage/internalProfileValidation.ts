import type { StaffProfilePayload } from '@/types';

export const INTERNAL_REQUIRED_FIELDS = [
  'gender',
  'dateOfBirth',
  'phone',
  'addressStreet',
  'addressCity',
  'addressState',
  'addressCountry',
  'addressPostalCode',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
] as const satisfies readonly Exclude<keyof StaffProfilePayload, 'nationalId'>[];

export type InternalRequiredField = (typeof INTERNAL_REQUIRED_FIELDS)[number];

export function getMissingInternalProfileFields(
  profile: StaffProfilePayload,
): InternalRequiredField[] {
  return INTERNAL_REQUIRED_FIELDS.filter((field) => !profile[field].trim());
}
