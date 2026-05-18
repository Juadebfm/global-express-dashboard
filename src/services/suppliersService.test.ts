import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addMySupplier,
  decideSupplierValidationRequest,
  getAllSuppliers,
  getMySupplierUpdateRequests,
  getMySupplierValidationRequests,
  getMySuppliers,
  requestSupplierUpdate,
} from './suppliersService';

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

describe('getMySuppliers', () => {
  it('unwraps { success, data } and forwards pagination', async () => {
    mockFetch({
      success: true,
      data: {
        data: [
          {
            id: 's1',
            displayName: 'Acme Co',
            email: 'a@acme.test',
            isActive: true,
            createdAt: '',
            updatedAt: '',
          },
        ],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
    });

    const result = await getMySuppliers('token', { page: 1, limit: 50, isActive: true });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);

    const { url, init } = lastCall();
    expect(url).toContain('/users/me/suppliers');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=50');
    expect(url).toContain('isActive=true');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('surfaces 401 errors with the backend message', async () => {
    mockFetch({ message: 'Unauthorized' }, 401);
    await expect(getMySuppliers('token')).rejects.toThrow('Unauthorized');
  });
});

describe('addMySupplier', () => {
  it('POSTs the payload and returns createdSupplier/linkedNow flags', async () => {
    mockFetch({
      success: true,
      data: {
        supplier: {
          id: 's2',
          displayName: 'New Supplier',
          email: 'new@s.test',
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
        createdSupplier: true,
        linkedNow: true,
      },
    });

    const result = await addMySupplier('token', { email: 'new@s.test' });

    expect(result.createdSupplier).toBe(true);
    expect(result.linkedNow).toBe(true);

    const { url, init } = lastCall();
    expect(url).toContain('/users/me/suppliers');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'new@s.test' });
  });
});

describe('requestSupplierUpdate', () => {
  it('POSTs to the supplier-specific update-request route', async () => {
    mockFetch({
      success: true,
      data: {
        id: 'r1',
        supplierId: 's1',
        requestedBy: 'u1',
        status: 'pending',
        createdAt: '',
        updatedAt: '',
      },
    });

    const result = await requestSupplierUpdate('token', 's1', {
      firstName: 'Bob',
      note: 'Legal name change',
    });

    expect(result.status).toBe('pending');
    const { url, init } = lastCall();
    expect(url).toContain('/users/me/suppliers/s1/update-request');
    expect(init.method).toBe('POST');
  });
});

describe('getMySupplierUpdateRequests', () => {
  it('returns paginated requests and includes status query', async () => {
    mockFetch({
      success: true,
      data: {
        data: [
          {
            id: 'r1',
            supplierId: 's1',
            requestedBy: 'u1',
            status: 'pending',
            createdAt: '',
            updatedAt: '',
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    const result = await getMySupplierUpdateRequests('token', { status: 'pending' });

    expect(result.data[0].status).toBe('pending');
    const { url } = lastCall();
    expect(url).toContain('/users/me/suppliers/update-requests');
    expect(url).toContain('status=pending');
  });
});

describe('getMySupplierValidationRequests', () => {
  it('hits the validation-requests route', async () => {
    mockFetch({
      success: true,
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      },
    });

    await getMySupplierValidationRequests('token');
    const { url } = lastCall();
    expect(url).toContain('/users/me/suppliers/validation-requests');
  });
});

describe('decideSupplierValidationRequest', () => {
  it('PATCHes the decision and forwards isTrue+note', async () => {
    mockFetch({
      success: true,
      data: {
        id: 'r1',
        supplierId: 's1',
        requestedBy: 'u1',
        status: 'accepted',
        createdAt: '',
        updatedAt: '',
      },
    });

    const result = await decideSupplierValidationRequest('token', 'r1', {
      isTrue: true,
      note: 'Confirmed',
    });

    expect(result.status).toBe('accepted');
    const { url, init } = lastCall();
    expect(url).toContain('/users/me/suppliers/validation-requests/r1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ isTrue: true, note: 'Confirmed' });
  });
});

describe('getAllSuppliers (admin)', () => {
  it('GETs /users/suppliers with auth and paginates', async () => {
    mockFetch({
      success: true,
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 },
      },
    });

    await getAllSuppliers('admin-token', { limit: 25 });
    const { url, init } = lastCall();
    expect(url).toContain('/users/suppliers');
    expect(url).toContain('limit=25');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer admin-token');
  });
});
