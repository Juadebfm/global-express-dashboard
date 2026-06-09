import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBankAccounts, updateBankAccounts } from '@/services/settingsService';
import { STALE_TIME } from '@/lib/queryDefaults';
import type { BankAccountSettings, UpdateBankAccountsPayload } from '@/types';
import { useAuthToken } from './useAuthToken';

export function useBankAccounts(): {
  data: BankAccountSettings | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const q = useQuery<BankAccountSettings, Error>({
    queryKey: ['settings', 'bank-accounts'],
    queryFn: getBankAccounts,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}

export function useUpdateBankAccounts(): {
  mutate: (payload: UpdateBankAccountsPayload) => Promise<BankAccountSettings>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<BankAccountSettings, Error, UpdateBankAccountsPayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateBankAccounts(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'bank-accounts'] });
    },
  });

  return { mutate: (p) => m.mutateAsync(p), isPending: m.isPending, error: m.error };
}
