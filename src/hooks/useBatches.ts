import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBatches,
  getBatch,
  getBatchRoster,
  addOrderToBatch,
  removeOrderFromBatch,
  closeBatch,
  getAvailableOrdersForBatch,
  createBatch,
} from '@/services';
import {
  getDispatchBatchMovement,
  updateDispatchBatchStatus,
} from '@/services/shipmentsService';
import type { CreateBatchPayload } from '@/services';
import type { Batch, BatchMovement, BatchMovementUpdateResult } from '@/types';
import type {
  BatchListParams,
} from '@/services/batchesService';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useBatches(params: BatchListParams = {}) {
  return useQuery({
    queryKey: ['batches', 'list', params],
    queryFn: () => getBatches(getToken(), params),
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batches', 'detail', batchId],
    queryFn: () => getBatch(getToken(), batchId!),
    enabled: !!batchId,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useBatchRoster(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batches', 'roster', batchId],
    queryFn: () => getBatchRoster(getToken(), batchId!),
    enabled: !!batchId,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

const batchMovementKey = (batchId: string | undefined) =>
  ['shipments', 'batches', batchId, 'movement'] as const;

/** Staff can read this backend-calculated state. The write is capability-gated separately. */
export function useBatchMovement(batchId: string | undefined) {
  return useQuery({
    queryKey: batchMovementKey(batchId),
    queryFn: () => getDispatchBatchMovement(getToken(), batchId!),
    enabled: !!batchId,
    staleTime: STALE_TIME.REAL_TIME,
    retry: false,
  });
}

export function useAvailableOrdersForBatch(batchId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['batches', 'available-orders', batchId],
    queryFn: () => getAvailableOrdersForBatch(getToken(), batchId!),
    // This endpoint itself is capability-protected. Keep its request behind
    // the same gate as the manual "Add order" control.
    enabled: !!batchId && enabled,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useAddOrderToBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, orderId }: { batchId: string; orderId: string }) =>
      addOrderToBatch(getToken(), batchId, { orderId }),
    onSuccess: (_data, { batchId }) => {
      void queryClient.invalidateQueries({ queryKey: ['batches', 'roster', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'detail', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'available-orders', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRemoveOrderFromBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, orderId }: { batchId: string; orderId: string }) =>
      removeOrderFromBatch(getToken(), batchId, orderId),
    onSuccess: (_data, { batchId }) => {
      void queryClient.invalidateQueries({ queryKey: ['batches', 'roster', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'detail', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'available-orders', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
    },
  });
}

export function useAdvanceBatchMovement() {
  const queryClient = useQueryClient();
  return useMutation<BatchMovementUpdateResult, Error, { batchId: string; statusV2: string }>({
    mutationFn: ({ batchId, statusV2 }) =>
      updateDispatchBatchStatus(getToken(), batchId, { statusV2 }),
    onSuccess: (data, { batchId }) => {
      queryClient.setQueryData<BatchMovement>(batchMovementKey(batchId), data.movement);
      void queryClient.invalidateQueries({ queryKey: ['batches', 'detail', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'roster', batchId] });
      void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
    },
  });
}

export function useCloseBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => closeBatch(getToken(), batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation<Batch, Error, CreateBatchPayload>({
    mutationFn: (payload) => createBatch(getToken(), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
    },
  });
}
