import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { completeDelivery, completePickup, resendDeliveryPin, resendPickupPin, updateOrderStatus } from '@/services';
import type { CompleteDeliveryPayload, CompletePickupPayload } from '@/services/ordersService';

const TOKEN_KEY = 'globalxpress_token';

function getToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Not authenticated');
  return token;
}

function invalidateLastMileData(queryClient: QueryClient, batchId: string, orderId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['batches', 'roster', batchId] });
  void queryClient.invalidateQueries({ queryKey: ['batches', 'list'] });
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
  void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  void queryClient.invalidateQueries({ queryKey: ['order', 'timeline'] });
  void queryClient.invalidateQueries({ queryKey: ['shipments'] });
}

/** Post-batch actions intentionally have no generic toast: the Last-mile
 * workspace maps 400/403/409 responses to the staff-facing explanation. */
export function useLastMileActions() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ orderId, statusV2 }: { batchId: string; orderId: string; statusV2: string }) =>
      updateOrderStatus(getToken(), orderId, statusV2),
    onSuccess: (_data, { batchId, orderId }) => invalidateLastMileData(queryClient, batchId, orderId),
  });

  const complete = useMutation({
    mutationFn: ({ orderId, payload }: { batchId: string; orderId: string; payload: CompletePickupPayload }) =>
      completePickup(getToken(), orderId, payload),
    onSuccess: (_data, { batchId, orderId }) => invalidateLastMileData(queryClient, batchId, orderId),
  });

  const resendPin = useMutation({
    mutationFn: ({ orderId }: { batchId: string; orderId: string }) => resendPickupPin(getToken(), orderId),
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: ({ orderId, payload }: { batchId: string; orderId: string; payload: CompleteDeliveryPayload }) =>
      completeDelivery(getToken(), orderId, payload),
    onSuccess: (_data, { batchId, orderId }) => invalidateLastMileData(queryClient, batchId, orderId),
  });

  const resendDelivery = useMutation({
    mutationFn: ({ orderId }: { batchId: string; orderId: string }) => resendDeliveryPin(getToken(), orderId),
  });

  return { updateStatus, complete, resendPin, completeDelivery: completeDeliveryMutation, resendDelivery };
}
