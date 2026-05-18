import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addClientSupplier,
  createClientGoodsIntake,
  getClientSuppliers,
  getClientWorkbench,
} from './clientsService';

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

describe('getClientWorkbench', () => {
  it('GETs /admin/clients/:id/workbench and unwraps the envelope', async () => {
    mockFetch({
      success: true,
      data: {
        client: {
          id: 'c1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.test',
          phone: '+234',
          isActive: true,
          totalOrders: 5,
          totalPayments: '12345',
          lastOrderAt: null,
          createdAt: '',
          updatedAt: '',
        },
        suppliers: [],
        suppliersPagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        recentOrders: [],
        recentOrdersPagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    });

    const result = await getClientWorkbench('token', 'c1');

    expect(result.client.id).toBe('c1');
    expect(result.suppliers).toEqual([]);
    const { url } = lastCall();
    expect(url).toContain('/admin/clients/c1/workbench');
  });
});

describe('getClientSuppliers', () => {
  it('forwards pagination params', async () => {
    mockFetch({
      success: true,
      data: { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
    });

    await getClientSuppliers('token', 'c1', { page: 2, limit: 10 });
    const { url } = lastCall();
    expect(url).toContain('/admin/clients/c1/suppliers');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });
});

describe('addClientSupplier', () => {
  it('POSTs payload to /admin/clients/:id/suppliers', async () => {
    mockFetch({
      success: true,
      data: {
        supplier: {
          id: 's1',
          displayName: 'New Co',
          email: 'new@s.test',
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
        createdSupplier: true,
        linkedNow: true,
      },
    });

    const result = await addClientSupplier('token', 'c1', { email: 'new@s.test' });

    expect(result.linkedNow).toBe(true);
    const { url, init } = lastCall();
    expect(url).toContain('/admin/clients/c1/suppliers');
    expect(init.method).toBe('POST');
  });
});

describe('createClientGoodsIntake', () => {
  it('POSTs to /admin/clients/:id/goods-intake with package detail', async () => {
    mockFetch({
      success: true,
      data: {
        id: 'o1',
        trackingNumber: 'GX-1',
        statusV2: 'created',
        statusLabel: 'Created',
        isPreorder: false,
      },
    });

    const result = await createClientGoodsIntake('token', 'c1', {
      shipmentType: 'air',
      packages: [{ quantity: 2, weightKg: 5 }],
    });

    expect(result.trackingNumber).toBe('GX-1');
    const { url, init } = lastCall();
    expect(url).toContain('/admin/clients/c1/goods-intake');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.packages[0].quantity).toBe(2);
  });
});
