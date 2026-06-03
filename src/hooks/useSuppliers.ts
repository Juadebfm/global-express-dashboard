import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useFeedbackStore } from '@/store';
import {
  addMySupplier,
  decideSupplierValidationRequest,
  getAllSuppliers,
  getMySupplierUpdateRequests,
  getMySupplierValidationRequests,
  getMySuppliers,
  requestSupplierUpdate,
} from '@/services/suppliersService';
import type {
  AddSupplierPayload,
  AddSupplierResult,
  ApiSupplierUpdateRequest,
  PaginatedSuppliers,
  PaginatedSupplierUpdateRequests,
  SupplierListParams,
  SupplierUpdateRequestListParams,
  SupplierUpdateRequestPayload,
  SupplierValidationDecisionPayload,
} from '@/types';
import { useAuthToken } from './useAuthToken';

const MY_SUPPLIERS_KEY = ['suppliers', 'me'] as const;
const MY_UPDATE_REQUESTS_KEY = ['suppliers', 'me', 'update-requests'] as const;
const MY_VALIDATION_REQUESTS_KEY = ['suppliers', 'me', 'validation-requests'] as const;
const ALL_SUPPLIERS_KEY = ['suppliers', 'all'] as const;

// ── Reads ────────────────────────────────────────────────────────────────────

export function useMySuppliers(params: SupplierListParams = {}): {
  data: PaginatedSuppliers | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedSuppliers>({
    queryKey: [...MY_SUPPLIERS_KEY, params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMySuppliers(token, params);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: MY_SUPPLIERS_KEY }),
  };
}

export function useMySupplierUpdateRequests(
  params: SupplierUpdateRequestListParams = {},
): {
  data: PaginatedSupplierUpdateRequests | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedSupplierUpdateRequests>({
    queryKey: [...MY_UPDATE_REQUESTS_KEY, params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMySupplierUpdateRequests(token, params);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: MY_UPDATE_REQUESTS_KEY }),
  };
}

export function useMySupplierValidationRequests(
  params: SupplierUpdateRequestListParams = {},
): {
  data: PaginatedSupplierUpdateRequests | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedSupplierUpdateRequests>({
    queryKey: [...MY_VALIDATION_REQUESTS_KEY, params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMySupplierValidationRequests(token, params);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: MY_VALIDATION_REQUESTS_KEY }),
  };
}

export function useAllSuppliers(params: SupplierListParams = {}): {
  data: PaginatedSuppliers | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedSuppliers>({
    queryKey: [...ALL_SUPPLIERS_KEY, params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAllSuppliers(token, params);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ALL_SUPPLIERS_KEY }),
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────

export function useAddMySupplier(): {
  mutate: (payload: AddSupplierPayload) => Promise<AddSupplierResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<AddSupplierResult, Error, AddSupplierPayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return addMySupplier(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_SUPPLIERS_KEY });
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

export function useRequestSupplierUpdate(): {
  mutate: (params: {
    supplierId: string;
    payload: SupplierUpdateRequestPayload;
  }) => Promise<ApiSupplierUpdateRequest>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    ApiSupplierUpdateRequest,
    Error,
    { supplierId: string; payload: SupplierUpdateRequestPayload }
  >({
    mutationFn: async ({ supplierId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return requestSupplierUpdate(token, supplierId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_UPDATE_REQUESTS_KEY });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.suppliers.updateRequestSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.suppliers.updateRequestError,
      });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useDecideSupplierValidationRequest(): {
  mutate: (params: {
    id: string;
    payload: SupplierValidationDecisionPayload;
  }) => Promise<ApiSupplierUpdateRequest>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    ApiSupplierUpdateRequest,
    Error,
    { id: string; payload: SupplierValidationDecisionPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return decideSupplierValidationRequest(token, id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VALIDATION_REQUESTS_KEY });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.suppliers.validationDecisionSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.suppliers.validationDecisionError,
      });
    },
  });

  return {
    mutate: (params) => m.mutateAsync(params),
    isPending: m.isPending,
    error: m.error,
  };
}
