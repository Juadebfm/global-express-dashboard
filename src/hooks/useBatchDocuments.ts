import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBatchDocuments,
  presignBatchDocument,
  confirmBatchDocument,
} from '@/services/batchesService';
import type { BatchDocumentType } from '@/types';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

export function useBatchDocuments(batchId: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  return useQuery({
    queryKey: ['batches', batchId, 'documents'],
    queryFn: () => getBatchDocuments(token!, batchId),
    enabled: !!batchId && !!token,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useUploadBatchDocument(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { file: File; documentType: BatchDocumentType }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');

      const { uploadUrl, r2Key } = await presignBatchDocument(
        token,
        batchId,
        { contentType: params.file.type, fileName: params.file.name },
      );

      const r2Upload = await fetch(uploadUrl, {
        method: 'PUT',
        body: params.file,
        headers: { 'Content-Type': params.file.type },
      });
      if (!r2Upload.ok) {
        throw new Error(`Document upload failed (${r2Upload.status})`);
      }

      return confirmBatchDocument(
        token,
        batchId,
        { r2Key, documentType: params.documentType, fileName: params.file.name },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['batches', batchId, 'documents'],
      });
    },
  });
}
