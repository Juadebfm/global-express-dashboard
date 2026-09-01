import type { ReactElement, ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUploadPaymentReceipt } from './usePaymentReceipts';

const { presignPaymentReceipt, submitPaymentReceipt, useAuthToken } = vi.hoisted(() => ({
  presignPaymentReceipt: vi.fn(),
  submitPaymentReceipt: vi.fn(),
  useAuthToken: vi.fn(),
}));

vi.mock('@/services/paymentsService', () => ({
  presignPaymentReceipt,
  submitPaymentReceipt,
  verifyPaymentReceipt: vi.fn(),
}));

vi.mock('./useAuthToken', () => ({ useAuthToken }));

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useUploadPaymentReceipt', () => {
  it('refreshes every shipment surface after a receipt is submitted', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    useAuthToken.mockReturnValue(async () => 'token');
    presignPaymentReceipt.mockResolvedValue({ uploadUrl: 'https://uploads.example/receipt', r2Key: 'receipts/r1' });
    submitPaymentReceipt.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', status: 'pending' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })));

    const { result } = renderHook(() => useUploadPaymentReceipt(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutate({
        presign: { orderId: 'order-1', contentType: 'image/png', originalFileName: 'receipt.png' },
        file: new Blob(['receipt'], { type: 'image/png' }),
        submit: { orderId: 'order-1', amount: 100, currency: 'NGN' },
      });
    });

    for (const queryKey of [['payments'], ['orders'], ['order'], ['shipments'], ['dashboard']]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
  });
});
