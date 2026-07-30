import { describe, expect, it } from 'vitest';
import { getMissingInternalProfileFields } from './internalProfileValidation';

const completeProfile = {
  gender: 'female' as const,
  dateOfBirth: '1990-01-01',
  phone: '+2348012345678',
  addressStreet: '44 Okunola Aina Street',
  addressCity: 'Ikeja',
  addressState: 'Lagos',
  addressCountry: 'Nigeria' as const,
  addressPostalCode: '200100',
  emergencyContactName: 'Example Contact',
  emergencyContactPhone: '+2348098765432',
  emergencyContactRelationship: 'Parent',
  nationalId: '',
};

describe('getMissingInternalProfileFields', () => {
  it('does not require National ID or Passport', () => {
    expect(getMissingInternalProfileFields(completeProfile)).toEqual([]);
  });

  it('identifies each required blank field', () => {
    expect(getMissingInternalProfileFields({
      ...completeProfile,
      addressCity: '',
      emergencyContactPhone: ' ',
      emergencyContactRelationship: '',
    })).toEqual([
      'addressCity',
      'emergencyContactPhone',
      'emergencyContactRelationship',
    ]);
  });
});
