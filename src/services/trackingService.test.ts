import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMasterTrackingNumber, trackShipment } from './trackingService';

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

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('isMasterTrackingNumber', () => {
  // Master references are staff-only. The public endpoint 404s on them, so the
  // customer product must never send or display one.
  it('recognises air and ocean master references in any case', () => {
    expect(isMasterTrackingNumber('AIR-20260727-0001')).toBe(true);
    expect(isMasterTrackingNumber('SEA-20260727-0001')).toBe(true);
    expect(isMasterTrackingNumber('air-20260727-0001')).toBe(true);
    expect(isMasterTrackingNumber('  AIR-20260727-0001  ')).toBe(true);
  });

  it('does not flag a customer batch reference', () => {
    expect(isMasterTrackingNumber('20260727-P8SM')).toBe(false);
    expect(isMasterTrackingNumber('20260804-A1B2')).toBe(false);
  });
});

describe('trackShipment', () => {
  it('passes through a customer batch result with its goods', async () => {
    mockFetch({
      success: true,
      data: {
        trackingNumber: '20260727-P8SM',
        trackingScope: 'customer_batch',
        status: 'PREPARING_FOR_DEPARTURE',
        statusLabel: 'Preparing for Departure',
        lastUpdate: 'Aug 4, 2026 · 05:37 PM',
        lastLocation: 'South Korea',
        estimatedDelivery: null,
        cargoMetrics: { packageCount: 2, totalWeightKg: '94.000', totalCbm: '1.014760' },
        goods: [
          {
            description: "Children's clothes",
            packageCount: 2,
            weightKg: '94.00',
            status: 'PREPARING_FOR_DEPARTURE',
            statusLabel: 'Preparing for Departure',
          },
        ],
        timeline: [
          {
            status: 'PREPARING_FOR_DEPARTURE',
            statusLabel: 'Preparing for Departure',
            timestamp: '2026-08-04T17:36:59.692Z',
          },
        ],
      },
    });

    const result = await trackShipment('20260727-P8SM');

    expect(result.trackingScope).toBe('customer_batch');
    expect(result.goods).toHaveLength(1);
    // Batch-scoped goods carry no individual tracking number.
    expect(result.goods?.[0]).not.toHaveProperty('trackingNumber');
    expect(result.cargoMetrics?.packageCount).toBe(2);
  });

  it('defaults the scope to a single order when the field is absent', async () => {
    mockFetch({
      success: true,
      data: {
        trackingNumber: '20260726-0001',
        statusLabel: 'In Transit',
        lastUpdate: 'Aug 4, 2026',
        lastLocation: 'In Transit',
        estimatedDelivery: null,
        timeline: [],
      },
    });

    const result = await trackShipment('20260726-0001');

    expect(result.trackingScope).toBe('order');
  });

  it('always returns an array for the timeline', async () => {
    mockFetch({
      success: true,
      data: {
        trackingNumber: '20260804-A1B2',
        trackingScope: 'customer_batch',
        statusLabel: 'Preparing for Departure',
        lastUpdate: 'Aug 4, 2026',
        lastLocation: 'South Korea',
        estimatedDelivery: null,
      },
    });

    const result = await trackShipment('20260804-A1B2');

    expect(result.timeline).toEqual([]);
  });
});
