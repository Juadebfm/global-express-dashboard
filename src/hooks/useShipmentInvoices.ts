import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import {
  confirmRegDoc,
  confirmTaskInvoice,
  getRegDocs,
  getTaskInvoices,
  presignRegDoc,
  presignTaskInvoice,
} from '@/services/shipmentsService';
import type {
  InvoiceAttachment,
  InvoiceAttachmentConfirmPayload,
  InvoiceAttachmentPresignPayload,
} from '@/types';
import { useAuthToken } from './useAuthToken';
import { useR2Upload } from './useR2Upload';

const taskInvoiceKey = (invoiceId: string | undefined): readonly unknown[] =>
  ['shipments', 'invoices', invoiceId ?? '', 'task-invoice'] as const;

const regDocsKey = (invoiceId: string | undefined): readonly unknown[] =>
  ['shipments', 'invoices', invoiceId ?? '', 'reg-docs'] as const;

export function useTaskInvoices(invoiceId: string | undefined): {
  data: InvoiceAttachment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<InvoiceAttachment[]>({
    queryKey: taskInvoiceKey(invoiceId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!invoiceId) throw new Error('Missing invoice id');
      return getTaskInvoices(token, invoiceId);
    },
    enabled: !!invoiceId,
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: taskInvoiceKey(invoiceId) }),
  };
}

export function useRegDocs(invoiceId: string | undefined): {
  data: InvoiceAttachment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<InvoiceAttachment[]>({
    queryKey: regDocsKey(invoiceId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!invoiceId) throw new Error('Missing invoice id');
      return getRegDocs(token, invoiceId);
    },
    enabled: !!invoiceId,
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: regDocsKey(invoiceId) }),
  };
}

export interface UploadInvoiceAttachmentInput {
  file: Blob;
  presign: InvoiceAttachmentPresignPayload;
  confirm: Omit<InvoiceAttachmentConfirmPayload, 'r2Key'>;
}

export function useUploadTaskInvoice(invoiceId: string | undefined): {
  mutate: (input: UploadInvoiceAttachmentInput) => Promise<InvoiceAttachment>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const upload = useR2Upload();

  const m = useMutation<InvoiceAttachment, Error, UploadInvoiceAttachmentInput>({
    mutationFn: async ({ file, presign, confirm }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!invoiceId) throw new Error('Missing invoice id');

      return upload({
        file,
        contentType: presign.contentType,
        presign: () => presignTaskInvoice(token, invoiceId, presign),
        getUploadUrl: (r) => r.uploadUrl,
        confirm: (r) =>
          confirmTaskInvoice(token, invoiceId, { ...confirm, r2Key: r.r2Key }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskInvoiceKey(invoiceId) });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.taskInvoiceUploadSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.taskInvoiceUploadError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUploadRegDoc(invoiceId: string | undefined): {
  mutate: (input: UploadInvoiceAttachmentInput) => Promise<InvoiceAttachment>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const upload = useR2Upload();

  const m = useMutation<InvoiceAttachment, Error, UploadInvoiceAttachmentInput>({
    mutationFn: async ({ file, presign, confirm }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (!invoiceId) throw new Error('Missing invoice id');

      return upload({
        file,
        contentType: presign.contentType,
        presign: () => presignRegDoc(token, invoiceId, presign),
        getUploadUrl: (r) => r.uploadUrl,
        confirm: (r) =>
          confirmRegDoc(token, invoiceId, { ...confirm, r2Key: r.r2Key }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regDocsKey(invoiceId) });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.shipments.regDocUploadSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.shipments.regDocUploadError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}
