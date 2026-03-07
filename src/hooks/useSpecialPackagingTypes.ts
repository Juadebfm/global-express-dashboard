import { useQuery } from '@tanstack/react-query';
import type { SpecialPackagingType } from '@/types';
import { getSpecialPackagingTypes } from '@/services';
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
  });
}
