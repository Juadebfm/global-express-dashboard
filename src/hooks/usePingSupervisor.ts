import { useMutation } from '@tanstack/react-query';
import { pingSupervisor } from '@/services/paymentsService';
import { useAuthToken } from './useAuthToken';

export interface PingSupervisorResult {
  name: string;
  phone: string | null;
}

export function usePingSupervisor() {
  const getToken = useAuthToken();

  return useMutation<PingSupervisorResult, Error, string>({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return pingSupervisor(token, orderId);
    },
  });
}
