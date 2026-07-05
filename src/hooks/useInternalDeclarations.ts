import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInternalDeclarations,
  getInternalDeclaration,
  acceptDeclaration,
  rejectDeclaration,
  linkCustomer,
  getInternalOrder,
} from '@/services/internalDeclarationsService';
import type {
  InternalDeclarationListParams,
  RejectDeclarationPayload,
  LinkCustomerPayload,
} from '@/types/internalDeclarations.types';
import { STALE_TIME } from '@/lib/queryDefaults';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

export function useInternalDeclarations(params: InternalDeclarationListParams = {}) {
  return useQuery({
    queryKey: ['internal', 'declarations', params],
    queryFn: () => getInternalDeclarations(getToken(), params),
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useInternalDeclaration(id: string | undefined) {
  return useQuery({
    queryKey: ['internal', 'declaration', id],
    queryFn: () => getInternalDeclaration(getToken(), id!),
    enabled: !!id,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useAcceptDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acceptDeclaration(getToken(), id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declaration', id] });
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declarations'] });
    },
  });
}

export function useRejectDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectDeclarationPayload }) =>
      rejectDeclaration(getToken(), id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declaration', id] });
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declarations'] });
    },
  });
}

export function useLinkCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LinkCustomerPayload }) =>
      linkCustomer(getToken(), id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declaration', id] });
      void queryClient.invalidateQueries({ queryKey: ['internal', 'declarations'] });
    },
  });
}

export function useInternalOrder(orderId: string | null | undefined) {
  return useQuery({
    queryKey: ['internal', 'order', orderId],
    queryFn: () => getInternalOrder(getToken(), orderId!),
    enabled: !!orderId,
    staleTime: STALE_TIME.SLOW_MOVING,
  });
}
