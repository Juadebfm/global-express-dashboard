import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import {
  addClientSupplier,
  createClientGoodsIntake,
  getClientSuppliers,
  getClientWorkbench,
} from '@/services/clientsService';
import type {
  AddSupplierPayload,
  AddSupplierResult,
  ApiOrder,
  ApiSupplier,
  ClientWorkbenchData,
  CreateGoodsIntakePayload,
  PaginatedSuppliers,
  SupplierListParams,
} from '@/types';
import { useAuthToken } from './useAuthToken';

const workbenchKey = (clientId: string): readonly [string, string, string] =>
  ['clients', clientId, 'workbench'] as const;

const clientSuppliersKey = (
  clientId: string,
): readonly [string, string, string] =>
  ['clients', clientId, 'suppliers'] as const;

export function useClientWorkbench(clientId: string | undefined): {
  data: ClientWorkbenchData<ApiSupplier, ApiOrder> | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<ClientWorkbenchData<ApiSupplier, ApiOrder>>({
    queryKey: clientId ? workbenchKey(clientId) : ['clients', '', 'workbench'],
    queryFn: async () => {
      if (!clientId) throw new Error('clientId is required');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getClientWorkbench(token, clientId);
    },
    enabled: !!clientId,
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      clientId
        ? queryClient.invalidateQueries({ queryKey: workbenchKey(clientId) })
        : undefined,
  };
}

export function useClientSuppliers(
  clientId: string | undefined,
  params: SupplierListParams = {},
): {
  data: PaginatedSuppliers | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedSuppliers>({
    queryKey: clientId
      ? [...clientSuppliersKey(clientId), params]
      : ['clients', '', 'suppliers', params],
    queryFn: async () => {
      if (!clientId) throw new Error('clientId is required');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getClientSuppliers(token, clientId, params);
    },
    enabled: !!clientId,
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () =>
      clientId
        ? queryClient.invalidateQueries({ queryKey: clientSuppliersKey(clientId) })
        : undefined,
  };
}

export function useAddClientSupplier(clientId: string | undefined): {
  mutate: (payload: AddSupplierPayload) => Promise<AddSupplierResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<AddSupplierResult, Error, AddSupplierPayload>({
    mutationFn: async (payload) => {
      if (!clientId) throw new Error('clientId is required');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return addClientSupplier(token, clientId, payload);
    },
    onSuccess: () => {
      if (!clientId) return;
      queryClient.invalidateQueries({ queryKey: clientSuppliersKey(clientId) });
      queryClient.invalidateQueries({ queryKey: workbenchKey(clientId) });
      pushMessage({ tone: 'success', message: FEEDBACK_MESSAGES.suppliers.addSuccess });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.suppliers.addError,
      });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useCreateClientGoodsIntake(clientId: string | undefined): {
  mutate: (payload: CreateGoodsIntakePayload) => Promise<ApiOrder>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<ApiOrder, Error, CreateGoodsIntakePayload>({
    mutationFn: async (payload) => {
      if (!clientId) throw new Error('clientId is required');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createClientGoodsIntake(token, clientId, payload);
    },
    onSuccess: () => {
      if (!clientId) return;
      queryClient.invalidateQueries({ queryKey: workbenchKey(clientId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.suppliers.goodsIntakeSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.suppliers.goodsIntakeError,
      });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
