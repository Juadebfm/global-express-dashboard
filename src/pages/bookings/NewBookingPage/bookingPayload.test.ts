import { describe, expect, it } from 'vitest';
import { buildSourcingSupplier, optionalText } from './bookingPayload';

describe('buildSourcingSupplier', () => {
  it('puts the selected directory supplier user id into the booking payload', () => {
    expect(buildSourcingSupplier({
      hasSourcingSupplier: true,
      sourcingSupplierType: 'directory',
      sourcingSupplierId: 'b4b64f20-b55b-4f5e-a854-f1a4e9f2c6e3',
    })).toEqual({ supplierId: 'b4b64f20-b55b-4f5e-a854-f1a4e9f2c6e3' });
  });

  it('preserves the external supplier fallback without creating a directory supplier', () => {
    expect(buildSourcingSupplier({
      hasSourcingSupplier: true,
      sourcingSupplierType: 'new',
      sourcingSupplierName: 'Guangzhou Trading',
      sourcingSupplierPhone: '+86123456789',
      sourcingSupplierEmail: 'contact@trading.example',
    })).toEqual({
      name: 'Guangzhou Trading',
      phone: '+86123456789',
      email: 'contact@trading.example',
    });
  });
});

describe('optionalText', () => {
  // The API types these as `.email().optional()` and similar, so a blank value
  // must be absent. Sending "" fails the format check and the whole request
  // comes back 400 — which is how a customer leaving an optional email empty
  // blocked their own booking.
  it('omits the key entirely when the value is blank', () => {
    expect(optionalText('recipientEmail', '')).toEqual({});
    expect(optionalText('recipientEmail', '   ')).toEqual({});
    expect(optionalText('recipientEmail', undefined)).toEqual({});
    expect(optionalText('recipientEmail', null)).toEqual({});
  });

  it('includes the trimmed value when one is given', () => {
    expect(optionalText('recipientEmail', '  julius@example.com ')).toEqual({
      recipientEmail: 'julius@example.com',
    });
  });

  it('spreads to nothing, so an absent field never becomes an empty one', () => {
    const payload = { recipientName: 'Oluwafemi', ...optionalText('recipientEmail', '') };
    expect('recipientEmail' in payload).toBe(false);
  });
});
