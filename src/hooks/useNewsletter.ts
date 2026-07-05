import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NewsletterSubscribersResult } from '@/types';
import { listSubscribers, deactivateSubscriber, deleteSubscriber, downloadSubscribersCsv } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

export function useNewsletterSubscribers(page = 1, limit = 50, activeOnly?: boolean) {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const { data, isLoading, error } = useQuery({
    queryKey: ['newsletter', 'subscribers', page, limit, activeOnly],
    queryFn: (): Promise<NewsletterSubscribersResult> =>
      listSubscribers(token, { page, limit, activeOnly }),
    enabled: !!token,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
  return {
    subscribers: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error: error instanceof Error ? error.message : error ? 'Failed to load subscribers' : null,
  };
}

export function useDeactivateSubscriber() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateSubscriber(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletter', 'subscribers'] }),
  });
}

export function useDeleteSubscriber() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubscriber(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletter', 'subscribers'] }),
  });
}

export function useExportSubscribers() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  return useMutation({
    mutationFn: () => downloadSubscribersCsv(token),
  });
}
