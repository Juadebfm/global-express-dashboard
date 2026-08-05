import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addCustomerDeclaredParcels,
  deleteCustomerDeclaredParcel,
  updateCustomerDeclaredParcel,
} from '@/services/ordersService';
import type {
  CustomerDeclaredParcel,
  CustomerDeclaredParcelInput,
  CustomerDeclaredParcelPatch,
} from '@/types';
import { useAuthToken } from './useAuthToken';

/**
 * The parcel list rides on the single-order response only, never on the list
 * endpoints, so the order detail is what has to be refetched after a change.
 */
function invalidateOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
}

export function useAddCustomerDeclaredParcels() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation<
    { parcels: CustomerDeclaredParcel[] },
    Error,
    { orderId: string; parcels: CustomerDeclaredParcelInput[] }
  >({
    mutationFn: async ({ orderId, parcels }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return addCustomerDeclaredParcels(orderId, parcels, token);
    },
    // Refetch on failure too: a 409 means staff started work while the form was
    // open, so the screen is out of date either way.
    onSettled: (_data, _error, { orderId }) => invalidateOrder(queryClient, orderId),
  });
}

export function useUpdateCustomerDeclaredParcel() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation<
    { parcel: CustomerDeclaredParcel },
    Error,
    { orderId: string; parcelId: string; patch: CustomerDeclaredParcelPatch }
  >({
    mutationFn: async ({ orderId, parcelId, patch }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateCustomerDeclaredParcel(orderId, parcelId, patch, token);
    },
    onSettled: (_data, _error, { orderId }) => invalidateOrder(queryClient, orderId),
  });
}

export function useDeleteCustomerDeclaredParcel() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation<
    { parcels: CustomerDeclaredParcel[] },
    Error,
    { orderId: string; parcelId: string }
  >({
    mutationFn: async ({ orderId, parcelId }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteCustomerDeclaredParcel(orderId, parcelId, token);
    },
    onSettled: (_data, _error, { orderId }) => invalidateOrder(queryClient, orderId),
  });
}
