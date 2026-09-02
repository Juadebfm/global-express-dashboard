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
  it('normalizes an order tracking number and returns only public tracking data', async () => {
    mockFetch({
      success: true,
      data: {
        trackingNumber: '20260902-AB12',
        status: 'IN_TRANSIT',
        statusLabel: 'In transit',
        lastUpdate: 'Sep 2, 2026 · 05:37 PM',
        lastLocation: 'Lagos, Nigeria',
        timeline: [
          {
            status: 'IN_TRANSIT',
            statusLabel: 'In transit',
            timestamp: '2026-09-02T17:36:59.692Z',
          },
        ],
      },
    });

    const result = await trackShipment('  20260902-ab12  ');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders/track/20260902-AB12'),
      expect.any(Object),
    );
    expect(result.statusLabel).toBe('In transit');
    expect(result.lastLocation).toBe('Lagos, Nigeria');
  });

  it('always returns an array for the timeline', async () => {
    mockFetch({
      success: true,
      data: {
        trackingNumber: '20260901-0001',
        statusLabel: 'In Transit',
        lastUpdate: 'Aug 4, 2026',
        lastLocation: 'In Transit',
        estimatedDelivery: null,
        timeline: [],
      },
    });

    const result = await trackShipment('20260901-0001');

    expect(result.timeline).toEqual([]);
  });
});
