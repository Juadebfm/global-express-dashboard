import { describe, expect, it } from 'vitest';
import { newBookingSchema } from './schema';

const VALID = {
  description: 'Children clothes',
  shipmentType: 'air' as const,
  weight: '5kg',
  declaredValue: '100',
  recipientName: 'Julius Adebowale',
  recipientPhone: '+2348012345678',
  recipientEmail: '',
  hasSourcingSupplier: false,
};

describe('order form schema', () => {
  it('accepts a minimal air order', () => {
    expect(newBookingSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts the three shipment types', () => {
    for (const shipmentType of ['air', 'sea', 'd2d'] as const) {
      const input = {
        ...VALID,
        shipmentType,
        // Door-to-door needs somewhere to deliver to.
        ...(shipmentType === 'd2d' && { recipientAddress: '12 Awolowo Road, Lagos' }),
      };
      expect(newBookingSchema.safeParse(input).success).toBe(true);
    }
  });

  // Door-to-door is delivered to the recipient; the other types are collected
  // from our Lagos office, so only this one needs an address.
  it('requires a delivery address for door-to-door', () => {
    const result = newBookingSchema.safeParse({ ...VALID, shipmentType: 'd2d' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'recipientAddress')).toBe(true);
    }
  });

  it('rejects a blank delivery address for door-to-door', () => {
    const result = newBookingSchema.safeParse({
      ...VALID,
      shipmentType: 'd2d',
      recipientAddress: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('does not ask air or ocean orders for an address', () => {
    for (const shipmentType of ['air', 'sea'] as const) {
      expect(newBookingSchema.safeParse({ ...VALID, shipmentType }).success).toBe(true);
    }
  });

  // A representative with no number cannot be contacted at pickup.
  it('requires a phone number when a pickup representative is named', () => {
    const result = newBookingSchema.safeParse({ ...VALID, pickupRepName: 'Ada' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'pickupRepPhone')).toBe(true);
    }
  });

  it('accepts a pickup representative with a phone number', () => {
    const result = newBookingSchema.safeParse({
      ...VALID,
      pickupRepName: 'Ada',
      pickupRepPhone: '+2348012345678',
    });

    expect(result.success).toBe(true);
  });

  it('treats the staff fields as optional', () => {
    const result = newBookingSchema.safeParse(VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.senderId).toBeUndefined();
      expect(result.data.pickupRepName).toBeUndefined();
    }
  });

  it('still validates the sourcing supplier rules', () => {
    const directoryMissingId = newBookingSchema.safeParse({
      ...VALID,
      hasSourcingSupplier: true,
      sourcingSupplierType: 'directory',
    });
    expect(directoryMissingId.success).toBe(false);

    const newMissingName = newBookingSchema.safeParse({
      ...VALID,
      hasSourcingSupplier: true,
      sourcingSupplierType: 'new',
    });
    expect(newMissingName.success).toBe(false);
  });
});
