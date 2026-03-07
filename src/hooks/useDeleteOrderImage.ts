import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteImage } from '@/services';
import { useAuthToken } from './useAuthToken';

interface DeleteOrderImageInput {
  imageId: string;
  orderId: string;
}

export function useDeleteOrderImage() {
  const queryClient = useQueryClient();
  const getToken = useAuthToken();

  return useMutation({
    mutationFn: async (input: DeleteOrderImageInput) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await deleteImage(token, input.imageId);
    },
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: ['order-images', input.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['order', input.orderId] });
    },
  });
}
