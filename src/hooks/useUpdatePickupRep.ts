import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePickupRep } from '@/services';
import { useAuthToken } from './useAuthToken';

interface UpdatePickupRepInput {
  orderId: string;
  pickupRepName: string;
  pickupRepPhone: string;
}

export function useUpdatePickupRep() {
  const queryClient = useQueryClient();
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (input: UpdatePickupRepInput) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      return updatePickupRep(token, input.orderId, {
        pickupRepName: input.pickupRepName,
        pickupRepPhone: input.pickupRepPhone,
      });
    },
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ['order', input.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
