import { useQuery } from '@tanstack/react-query';
import type { ItemTypeOption } from '@/services';
import { getItemTypes } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function useItemTypes(): { items: ItemTypeOption[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'item-types'],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return getItemTypes(token);
    },
    staleTime: STALE_TIME.STATIC,
  });

  return { items: data?.items ?? [], isLoading };
}
