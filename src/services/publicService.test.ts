import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  estimateShipping,
  getPublicCalculatorRates,
  getPublicShipmentTypes,
  submitPublicD2dIntake,
  subscribeToNewsletter,
} from './publicService';

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

describe('estimateShipping', () => {
  it('POSTs to /public/calculator/estimate without Authorization', async () => {
    mockFetch({
      success: true,
      data: {
        mode: 'air',
        weightKg: 12,
        cbm: null,
        estimatedCostUsd: 100,
        departureFrequency: 'weekly',
        estimatedTransitDays: 7,
        disclaimer: 'estimate only',
      },
    });

    const result = await estimateShipping({ shipmentType: 'air', weightKg: 12 });

    expect(result.estimatedCostUsd).toBe(100);
    const { url, init } = lastCall();
    expect(url).toContain('/public/calculator/estimate');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('normalizes ocean → sea before sending', async () => {
    mockFetch({
      success: true,
      data: {
        mode: 'sea',
        weightKg: null,
        cbm: 0.5,
        estimatedCostUsd: 50,
        departureFrequency: 'monthly',
        estimatedTransitDays: 30,
        disclaimer: '',
      },
    });
    await estimateShipping({ shipmentType: 'ocean', cbm: 0.5 });
    const { init } = lastCall();
    const body = JSON.parse(init.body as string);
    expect(body.shipmentType).toBe('sea');
  });
});

describe('getPublicShipmentTypes', () => {
  it('GETs and unwraps the items envelope', async () => {
    mockFetch({
      success: true,
      data: { items: [{ key: 'air', label: 'Air' }], updatedAt: '2026-05-19' },
    });
    const result = await getPublicShipmentTypes();
    expect(result.items).toHaveLength(1);
    const { url, init } = lastCall();
    expect(url).toContain('/public/shipment-types');
    expect(init.method ?? 'GET').toBe('GET');
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});

describe('getPublicCalculatorRates', () => {
  it('GETs the rates endpoint anonymously', async () => {
    mockFetch({
      success: true,
      data: { air: { unit: 'kg', tiers: [] }, sea: { unit: 'cbm', flatRateUsdPerCbm: 200 } },
    });
    await getPublicCalculatorRates();
    const { url, init } = lastCall();
    expect(url).toContain('/public/calculator/rates');
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});

describe('subscribeToNewsletter', () => {
  it('POSTs the email and surfaces 409 conflicts', async () => {
    mockFetch({ success: true, data: { message: 'Subscribed' } });
    await subscribeToNewsletter({ email: 'a@b.test' });
    const { url, init } = lastCall();
    expect(url).toContain('/public/newsletter/subscribe');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.test' });

    mockFetch({ message: 'Email already subscribed' }, 409);
    await expect(subscribeToNewsletter({ email: 'a@b.test' })).rejects.toThrow(
      'Email already subscribed',
    );
  });
});

describe('submitPublicD2dIntake', () => {
  it('POSTs the intake payload without Authorization', async () => {
    mockFetch({
      success: true,
      data: { ticket: { id: 't1' }, contact: { email: 'a@b.test', accountLinked: false }, intakeRequest: {} },
    });
    const result = await submitPublicD2dIntake({
      fullName: 'Ada',
      email: 'a@b.test',
      phone: '+234555',
      city: 'Lagos',
      country: 'Nigeria',
      goodsDescription: 'Cup',
      deliveryPhone: '+234555',
      deliveryAddressLine1: '1 Marina',
      wantsAccount: false,
      consentAcknowledgement: true,
      estimatedWeightKg: 0,
      estimatedCbm: 0,
    });
    expect(result.ticket.id).toBe('t1');
    const { url, init } = lastCall();
    expect(url).toContain('/public/d2d/intake');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});
