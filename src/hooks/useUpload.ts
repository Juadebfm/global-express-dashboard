import { useMutation, useQueryClient } from '@tanstack/react-query';
import { presignUpload, confirmUpload } from '@/services';

const TOKEN_KEY = 'globalxpress_token';

interface UploadParams {
  orderId: string;
  file: File;
}

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, file }: UploadParams) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');

      const contentType = file.type as 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp';

      const { uploadUrl, r2Key } = await presignUpload(token, {
        orderId,
        contentType,
      });

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      await confirmUpload(token, { orderId, r2Key });

      return { r2Key };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-images'] });
    },
  });
}
