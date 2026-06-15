import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import {
  getDeclarations,
  getDeclaration,
  createDeclaration,
  getOrderTrackingNumber,
} from '@/services/supplierPortalService';
import type { DeclarationListParams, NewDeclarationPayload } from '@/types/supplierPortal.types';
import { STALE_TIME } from '@/lib/queryDefaults';

export function useSupplierDeclarations(params: DeclarationListParams = {}) {
  const token = useSupplierAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['supplier', 'declarations', params],
    queryFn: () => getDeclarations(token!, params),
    enabled: !!token,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useSupplierDeclaration(id: string | undefined) {
  const token = useSupplierAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['supplier', 'declaration', id],
    queryFn: () => getDeclaration(token!, id!),
    enabled: !!token && !!id,
    staleTime: STALE_TIME.REAL_TIME,
  });
}

export function useOrderTrackingNumber(orderId: string | null | undefined) {
  const token = useSupplierAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['supplier', 'order-tracking', orderId],
    queryFn: () => getOrderTrackingNumber(token!, orderId!),
    enabled: !!token && !!orderId,
    staleTime: STALE_TIME.SLOW_MOVING,
    retry: false,
  });
}

export function useCreateDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewDeclarationPayload) => {
      const token = useSupplierAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      return createDeclaration(token, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier', 'declarations'] });
    },
  });
}
