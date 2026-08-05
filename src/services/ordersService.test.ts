import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOrder, getOrderTimeline, getOrders, MAX_ORDERS_PAGE_SIZE, updateOrderStatus } from './ordersService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getOrders pagination limits', () => {
  it('does not send a request above the backend maximum', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOrders('token', 1, MAX_ORDERS_PAGE_SIZE + 1)).rejects.toThrow(
      `Orders page size must be between 1 and ${MAX_ORDERS_PAGE_SIZE}.`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getOrderTimeline', () => {
  it('keeps the verified goods and warehouse fields returned by the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                orderId: 'order-1',
                trackingNumber: '20260726-0001',
                status: 'PROCESSING_AT_ORIGIN',
                statusLabel: 'Processing at origin',
                timeline: [],
                goodsBreakdown: [
                  {
                    description: "Children's clothes",
                    itemType: 'Clothing',
                    quantity: 2,
                    weightKg: '12.5',
                    cbm: '0.125',
                    dimensionsCm: { length: '50', width: '40', height: '30' },
                    arrivalAt: '2026-07-26T09:00:00.000Z',
                    requiresExtraTruckMovement: true,
                    supplierName: 'Acme Trading',
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    await expect(getOrderTimeline('token', 'order-1')).resolves.toMatchObject({
      orderId: 'order-1',
      goodsBreakdown: [
        {
          description: "Children's clothes",
          itemType: 'Clothing',
          quantity: 2,
          weightKg: 12.5,
          cbm: 0.125,
          dimensionsCm: { length: 50, width: 40, height: 30 },
          arrivalAt: '2026-07-26T09:00:00.000Z',
          requiresExtraTruckMovement: true,
          supplierName: 'Acme Trading',
        },
      ],
    });
  });
});

describe('updateOrderStatus', () => {
  it('returns the updated order so the active staff workflow can immediately use its new status', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'order-1',
              trackingNumber: '20260726-0001',
              statusV2: 'WAREHOUSE_RECEIVED',
              statusLabel: 'Received at Warehouse',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateOrderStatus('token', 'order-1', 'WAREHOUSE_RECEIVED')).resolves.toMatchObject({
      id: 'order-1',
      statusV2: 'WAREHOUSE_RECEIVED',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/orders/order-1/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ statusV2: 'WAREHOUSE_RECEIVED' }),
      }),
    );
  });
});

describe('createOrder shipment type', () => {
  function mockCreate() {
    // Params are declared so the mock's call tuple is typed and the request
    // body can be read back, even though the stub ignores them.
    const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: { id: 'o1', trackingNumber: null }, url, init }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  const BASE = {
    recipientName: 'Julius Adebowale',
    recipientPhone: '+2348012345678',
    recipientEmail: '',
    orderDirection: 'inbound' as const,
    declaredValue: '100',
    description: 'Children clothes',
  };

  function sentBody(fetchMock: ReturnType<typeof mockCreate>) {
    const call = fetchMock.mock.calls.at(-1);
    if (!call) throw new Error('fetch was not called');
    return JSON.parse(call[1]?.body as string) as { shipmentType?: string };
  }

  // POST /orders accepts only air | ocean | d2d and rejects "sea" with a 400,
  // so every ocean order fails unless the UI wording is translated.
  it('sends ocean when the UI says sea', async () => {
    const fetchMock = mockCreate();
    await createOrder({ ...BASE, shipmentType: 'sea' }, 'token', 'key-1');
    expect(sentBody(fetchMock).shipmentType).toBe('ocean');
  });

  it('leaves air and d2d untouched', async () => {
    for (const shipmentType of ['air', 'd2d'] as const) {
      const fetchMock = mockCreate();
      await createOrder({ ...BASE, shipmentType }, 'token', 'key-2');
      expect(sentBody(fetchMock).shipmentType).toBe(shipmentType);
    }
  });

  it('passes ocean through unchanged', async () => {
    const fetchMock = mockCreate();
    await createOrder({ ...BASE, shipmentType: 'ocean' }, 'token', 'key-3');
    expect(sentBody(fetchMock).shipmentType).toBe('ocean');
  });
});
