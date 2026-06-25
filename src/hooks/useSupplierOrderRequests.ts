import { useQuery } from '@tanstack/react-query';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { getSupplierOrderRequests } from '@/services/supplierPortalService';
import { STALE_TIME } from '@/lib/queryDefaults';

export function useSupplierOrderRequests() {
  const token = useSupplierAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['supplier', 'order-requests'],
    queryFn: () => getSupplierOrderRequests(token!),
    enabled: !!token,
    staleTime: STALE_TIME.REAL_TIME,
  });
}
