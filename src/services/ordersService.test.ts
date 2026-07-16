import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrders, MAX_ORDERS_PAGE_SIZE } from './ordersService';

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
