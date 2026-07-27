import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrderTimeline, getOrders, MAX_ORDERS_PAGE_SIZE, updateOrderStatus } from './ordersService';

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
