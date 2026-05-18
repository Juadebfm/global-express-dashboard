import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  presignPaymentReceipt,
  submitPaymentReceipt,
  verifyPaymentReceipt,
} from '@/services/paymentsService';
import type {
  ApiPayment,
  ReceiptPresignPayload,
  ReceiptPresignResponse,
  ReceiptSubmitPayload,
  ReceiptVerifyPayload,
} from '@/types';
import { useAuthToken } from './useAuthToken';

export interface UploadReceiptInput {
  presign: ReceiptPresignPayload;
  file: Blob;
  submit: Omit<ReceiptSubmitPayload, 'r2Key'>;
}

/**
 * Three-step proof-of-payment upload, wrapped into a single mutation:
 *   1. presign → backend gives a presigned R2 PUT URL
 *   2. PUT the file directly to R2 (bytes never proxy through our API)
 *   3. submit metadata → backend creates the Payment row
 */
export function useUploadPaymentReceipt(): {
  mutate: (input: UploadReceiptInput) => Promise<ApiPayment>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<ApiPayment, Error, UploadReceiptInput>({
    mutationFn: async ({ presign, file, submit }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const presignResp: ReceiptPresignResponse = await presignPaymentReceipt(token, presign);

      const putResp = await fetch(presignResp.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': presign.contentType },
        body: file,
      });
      if (!putResp.ok) {
        throw new Error(`Receipt upload failed (${putResp.status})`);
      }

      return submitPaymentReceipt(token, { ...submit, r2Key: presignResp.r2Key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useVerifyPaymentReceipt(): {
  mutate: (params: { receiptId: string; payload: ReceiptVerifyPayload }) => Promise<ApiPayment>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<
    ApiPayment,
    Error,
    { receiptId: string; payload: ReceiptVerifyPayload }
  >({
    mutationFn: async ({ receiptId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return verifyPaymentReceipt(token, receiptId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}
