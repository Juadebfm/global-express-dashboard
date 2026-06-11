import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { ApiError } from '@/lib/apiClient';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import {
  approveDispatchBatchCutoff,
  getDispatchBatchByMasterTracking,
  moveDispatchBatchToNext,
  updateDispatchBatchCarrierInfo,
  updateDispatchBatchStatus,
} from '@/services/shipmentsService';
import type {
  DispatchBatch,
  DispatchBatchCarrierInfoPayload,
  DispatchBatchMoveToNextPayload,
  DispatchBatchStatusPayload,
} from '@/types';
import { useAuthToken } from './useAuthToken';

const BATCHES_KEY = ['shipments', 'batches'] as const;

const internalTrackKey = (masterTrackingNumber: string | undefined): readonly unknown[] =>
  ['shipments', 'internal-track', masterTrackingNumber ?? ''] as const;

function invalidateBatch(
  queryClient: ReturnType<typeof useQueryClient>,
  batchId: string,
): void {
  queryClient.invalidateQueries({ queryKey: BATCHES_KEY });
  queryClient.invalidateQueries({ queryKey: ['shipments', 'batches', batchId] });
  queryClient.invalidateQueries({ queryKey: ['shipments'] });
}

export function useInternalTrackByMasterTracking(
  masterTrackingNumber: string | undefined,
): {
  data: DispatchBatch | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<DispatchBatch>({
    queryKey: internalTrackKey(masterTrackingNumber),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!masterTrackingNumber) throw new Error('Missing master tracking number');
      return getDispatchBatchByMasterTracking(token, masterTrackingNumber);
    },
    enabled: !!masterTrackingNumber,
    staleTime: STALE_TIME.REAL_TIME,
    retry: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: internalTrackKey(masterTrackingNumber),
      }),
  };
}

export function useApproveBatchCutoff(): {
  mutate: (batchId: string) => Promise<DispatchBatch>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<DispatchBatch, Error, string>({
    mutationFn: async (batchId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return approveDispatchBatchCutoff(token, batchId);
    },
    onSuccess: (_data, batchId) => {
      invalidateBatch(queryClient, batchId);
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.batchApproveCutoffSuccess,
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        pushMessage({ tone: 'info', message: err.message });
      } else {
        pushMessage({
          tone: 'error',
          message: err.message || FEEDBACK_MESSAGES.shipments.batchApproveCutoffError,
        });
      }
    },
  });

  return {
    mutate: (batchId) => m.mutateAsync(batchId),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUpdateBatchCarrierInfo(): {
  mutate: (params: {
    batchId: string;
    payload: DispatchBatchCarrierInfoPayload;
  }) => Promise<DispatchBatch>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    DispatchBatch,
    Error,
    { batchId: string; payload: DispatchBatchCarrierInfoPayload }
  >({
    mutationFn: async ({ batchId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateDispatchBatchCarrierInfo(token, batchId, payload);
    },
    onSuccess: (_data, { batchId }) => {
      invalidateBatch(queryClient, batchId);
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.batchCarrierInfoSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.batchCarrierInfoError,
      });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUpdateBatchStatus(): {
  mutate: (params: {
    batchId: string;
    payload: DispatchBatchStatusPayload;
  }) => Promise<DispatchBatch>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    DispatchBatch,
    Error,
    { batchId: string; payload: DispatchBatchStatusPayload }
  >({
    mutationFn: async ({ batchId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateDispatchBatchStatus(token, batchId, payload);
    },
    onSuccess: (_data, { batchId }) => {
      invalidateBatch(queryClient, batchId);
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.batchStatusSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.batchStatusError,
      });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useMoveBatchToNext(): {
  mutate: (params: {
    batchId: string;
    payload: DispatchBatchMoveToNextPayload;
  }) => Promise<DispatchBatch>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    DispatchBatch,
    Error,
    { batchId: string; payload: DispatchBatchMoveToNextPayload }
  >({
    mutationFn: async ({ batchId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return moveDispatchBatchToNext(token, batchId, payload);
    },
    onSuccess: (_data, { batchId }) => {
      invalidateBatch(queryClient, batchId);
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.batchMoveSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.batchMoveError,
      });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}
