import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import { getShopInterestRequest, updateShopInterestRequest } from '@/services/shopService';
import type { ShopInterestRequest, UpdateShopInterestRequestPayload } from '@/types';
import { useAuthToken } from './useAuthToken';

function interestKey(interestRequestId: string): readonly unknown[] {
  return ['shop', 'interests', interestRequestId] as const;
}

export function useShopInterestRequest(interestRequestId: string | null | undefined): {
  data: ShopInterestRequest | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const q = useQuery<ShopInterestRequest>({
    queryKey: interestKey(interestRequestId ?? ''),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getShopInterestRequest(token, interestRequestId!);
    },
    enabled: !!interestRequestId,
    staleTime: STALE_TIME.REAL_TIME,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}

export function useUpdateShopInterestRequest(interestRequestId: string): {
  mutate: (payload: UpdateShopInterestRequestPayload) => Promise<ShopInterestRequest>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<ShopInterestRequest, Error, UpdateShopInterestRequestPayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateShopInterestRequest(token, interestRequestId, payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(interestKey(interestRequestId), data);
      pushMessage({ tone: 'success', message: FEEDBACK_MESSAGES.shop.interestUpdateSuccess });
    },
    onError: () => {
      pushMessage({ tone: 'error', message: FEEDBACK_MESSAGES.shop.interestUpdateError });
    },
  });
  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
