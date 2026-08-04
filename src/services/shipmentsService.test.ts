import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  confirmRegDoc,
  confirmTaskInvoice,
  getDispatchBatchMovement,
  getDispatchBatchByMasterTracking,
  getShipmentsDashboard,
  getRegDocs,
  getShipmentMeasurements,
  getTaskInvoices,
  moveDispatchBatchToNext,
  presignRegDoc,
  presignTaskInvoice,
  recordShipmentIntake,
  recordShipmentMeasurement,
  updateDispatchBatchCarrierInfo,
  updateDispatchBatchStatus,
} from './shipmentsService';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  ) as typeof fetch;
}

function lastCall(): { url: string; init: RequestInit } {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls.at(-1) ?? ['', {}];
  return { url: String(url), init: init as RequestInit };
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('recordShipmentIntake', () => {
  it('POSTs to /shipments/intake and unwraps { success, data }', async () => {
    mockFetch({
      success: true,
      data: { id: 'sh1', trackingNumber: 'TRK1' },
    });

    const result = await recordShipmentIntake('token', {
      shippingMark: 'juadeb',
      mode: 'air',
      goods: [{}],
    });

    expect(result.id).toBe('sh1');
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/intake');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token');
  });

  it('surfaces 403 errors with the backend message', async () => {
    mockFetch({ message: 'Forbidden' }, 403);
    await expect(
      recordShipmentIntake('token', {
        shippingMark: 'testmark',
        mode: 'air',
        goods: [{}],
      }),
    ).rejects.toThrow('Forbidden');
  });
});

describe('shipment measurements', () => {
  it('PUTs measurements with checkpoint + numbers', async () => {
    mockFetch({
      success: true,
      data: { id: 'm1', checkpoint: 'SK_WAREHOUSE', measuredWeightKg: 12 },
    });

    const result = await recordShipmentMeasurement('token', 'sh1', {
      checkpoint: 'SK_WAREHOUSE',
      measuredWeightKg: 12,
      measuredCbm: 0.05,
    });

    expect(result.id).toBe('m1');
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/sh1/measurements');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      checkpoint: 'SK_WAREHOUSE',
      measuredWeightKg: 12,
      measuredCbm: 0.05,
    });
  });

  it('GETs the measurements list', async () => {
    mockFetch({ success: true, data: [] });
    await getShipmentMeasurements('token', 'sh1');
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/sh1/measurements');
    expect(init.method ?? 'GET').toBe('GET');
  });
});

describe('task invoices', () => {
  it('presign hits the invoice-scoped path', async () => {
    mockFetch({ success: true, data: { uploadUrl: 'https://r2/upload', r2Key: 'k' } });
    await presignTaskInvoice('token', 'inv1', {
      contentType: 'application/pdf',
      fileSizeBytes: 1234,
      originalFileName: 'invoice.pdf',
    });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/invoices/inv1/task-invoice/presign');
    expect(init.method).toBe('POST');
  });

  it('confirm POSTs the r2Key + metadata', async () => {
    mockFetch({ success: true, data: { id: 'att1', invoiceId: 'inv1' } });
    await confirmTaskInvoice('token', 'inv1', {
      r2Key: 'attachments/inv1/file.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 1234,
      originalFileName: 'invoice.pdf',
    });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/invoices/inv1/task-invoice/confirm');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.r2Key).toBe('attachments/inv1/file.pdf');
  });

  it('GET lists task invoices for an invoice', async () => {
    mockFetch({ success: true, data: [] });
    await getTaskInvoices('token', 'inv1');
    const { url } = lastCall();
    expect(url).toContain('/shipments/invoices/inv1/task-invoice');
  });
});

describe('reg docs', () => {
  it('presign uses the reg-docs path', async () => {
    mockFetch({ success: true, data: { uploadUrl: 'u', r2Key: 'k' } });
    await presignRegDoc('token', 'inv1', {
      contentType: 'image/png',
      fileSizeBytes: 1000,
    });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/invoices/inv1/reg-docs/presign');
    expect(init.method).toBe('POST');
  });

  it('confirm + list hit reg-docs routes', async () => {
    mockFetch({ success: true, data: { id: 'r1' } });
    await confirmRegDoc('token', 'inv1', {
      r2Key: 'k',
      contentType: 'image/png',
      fileSizeBytes: 1000,
      originalFileName: 'permit.png',
    });
    expect(lastCall().url).toContain('/shipments/invoices/inv1/reg-docs/confirm');

    mockFetch({ success: true, data: [] });
    await getRegDocs('token', 'inv1');
    expect(lastCall().url).toContain('/shipments/invoices/inv1/reg-docs');
  });
});

describe('internal track + batch ops', () => {
  it('internal-track encodes the master tracking number', async () => {
    mockFetch({ success: true, data: { id: 'b1', status: 'open' } });
    await getDispatchBatchByMasterTracking('token', 'MASTER 42/AB');
    const { url } = lastCall();
    expect(url).toContain('/shipments/internal-track/MASTER%2042%2FAB');
  });

  it('carrier-info PATCHes the payload', async () => {
    mockFetch({ success: true, data: { id: 'b1', carrierName: 'Korean Air' } });
    await updateDispatchBatchCarrierInfo('token', 'b1', { carrierName: 'Korean Air' });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/batches/b1/carrier-info');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ carrierName: 'Korean Air' });
  });

  it('status PATCHes statusV2', async () => {
    mockFetch({
      success: true,
      data: {
        ok: true,
        updatedOrderCount: 2,
        movement: {
          batchId: 'b1',
          batchLifecycleStatus: 'closed',
          currentStatus: 'FLIGHT_DEPARTED',
          currentStatusLabel: 'Flight departed',
          heldFromStatus: null,
          allowedActions: [],
        },
      },
    });
    const result = await updateDispatchBatchStatus('token', 'b1', { statusV2: 'FLIGHT_DEPARTED' });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/batches/b1/status');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ statusV2: 'FLIGHT_DEPARTED' });
    expect(result.movement.currentStatusLabel).toBe('Flight departed');
  });

  it('gets the backend-calculated movement state and allowed actions', async () => {
    mockFetch({
      success: true,
      data: {
        batchId: 'b1',
        batchLifecycleStatus: 'closed',
        currentStatus: 'AT_ORIGIN_AIRPORT',
        currentStatusLabel: 'At origin airport',
        heldFromStatus: null,
        allowedActions: [
          {
            statusV2: 'BOARDED_ON_FLIGHT',
            label: 'Boarded on flight',
            description: 'Goods have been loaded onto the flight.',
            kind: 'advance',
          },
        ],
      },
    });

    const result = await getDispatchBatchMovement('token', 'b1');
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/batches/b1/status');
    expect(init.method ?? 'GET').toBe('GET');
    expect(result.allowedActions).toHaveLength(1);
    expect(result.allowedActions[0]?.statusV2).toBe('BOARDED_ON_FLIGHT');
  });

  it('move-to-next POSTs the supplier or package selection', async () => {
    mockFetch({ success: true, data: { id: 'b1' } });
    await moveDispatchBatchToNext('token', 'b1', {
      orderId: 'order-1',
      packageIds: ['p1', 'p2'],
    });
    const { url, init } = lastCall();
    expect(url).toContain('/shipments/batches/b1/move-to-next');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      orderId: 'order-1',
      packageIds: ['p1', 'p2'],
    });
  });
});

describe('customer-visible tracking number', () => {
  // A customer tracking number only exists once the goods are verified and
  // priced. Before that the backend sends null, and the frontend must not
  // substitute anything — least of all the internal order id, which is what
  // the old `tracking || id` fallback did.
  it('leaves sku null when the customer order has no tracking number yet', async () => {
    mockFetch({
      success: true,
      data: {
        data: [
          {
            id: 'e7d0e1a8-0000-4000-8000-000000000001',
            trackingNumber: null,
            description: "Children's clothes",
            statusV2: 'AWAITING_WAREHOUSE_RECEIPT',
            statusLabel: 'Processing at Origin',
          },
        ],
      },
    });

    const result = await getShipmentsDashboard('token', true);

    expect(result.shipments).toHaveLength(1);
    expect(result.shipments[0]?.sku).toBeNull();
  });

  it('never falls back to the internal order id', async () => {
    const internalId = 'e7d0e1a8-0000-4000-8000-000000000001';
    mockFetch({
      success: true,
      data: {
        data: [{ id: internalId, trackingNumber: null, statusV2: 'WAREHOUSE_RECEIVED' }],
      },
    });

    const result = await getShipmentsDashboard('token', true);

    expect(result.shipments[0]?.sku).not.toBe(internalId);
    expect(result.shipments[0]?.sku).toBeFalsy();
  });

  it('uses the customer batch tracking number once one is assigned', async () => {
    mockFetch({
      success: true,
      data: {
        data: [
          {
            id: 'e7d0e1a8-0000-4000-8000-000000000001',
            trackingNumber: '20260804-A1B2',
            statusV2: 'WAREHOUSE_VERIFIED_PRICED',
          },
        ],
      },
    });

    const result = await getShipmentsDashboard('token', true);

    expect(result.shipments[0]?.sku).toBe('20260804-A1B2');
  });

  it('leaves sku null on the staff list when a tracking number is absent', async () => {
    mockFetch({
      success: true,
      data: {
        data: [
          {
            id: 'order-1',
            trackingNumber: '',
            senderName: 'Test Customer',
            origin: 'South Korea',
            destination: 'Lagos, Nigeria',
            departureDate: null,
            eta: null,
            statusV2: 'WAREHOUSE_RECEIVED',
            statusLabel: 'Received at warehouse',
            shipmentType: 'air',
            numberOfPackages: 1,
            weight: '10',
            declaredValue: 100,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });

    const result = await getShipmentsDashboard('token', false);

    expect(result.shipments[0]?.sku).toBeNull();
  });
});
