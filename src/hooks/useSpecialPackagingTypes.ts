import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SpecialPackagingType } from '@/types';
import {
  getSpecialPackagingTypes,
  updateSpecialPackagingTypes,
  type SpecialPackagingUpsertItem,
} from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

interface UseSpecialPackagingTypesOptions {
  enabled?: boolean;
}

export function useSpecialPackagingTypes(options: UseSpecialPackagingTypesOptions = {}) {
  const getToken = useAuthToken();

  return useQuery<SpecialPackagingType[]>({
    queryKey: ['settings', 'special-packaging'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getSpecialPackagingTypes(token);
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}

/**
 * Superadmin-only full-replace of the special-packaging catalog.
 * Backend spec: PUT /api/v1/internal/settings/special-packaging, 0-50 entries.
 */
export function useUpdateSpecialPackagingTypes(): {
  mutate: (items: SpecialPackagingUpsertItem[]) => Promise<void>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<void, Error, SpecialPackagingUpsertItem[]>({
    mutationFn: async (items) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await updateSpecialPackagingTypes(token, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'special-packaging'] });
    },
  });

  return {
    mutate: (items) => m.mutateAsync(items),
    isPending: m.isPending,
    error: m.error,
  };
}
