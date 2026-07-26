import { describe, expect, it } from 'vitest';
import { buildSourcingSupplier } from './bookingPayload';

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
