export type OrderDirection = 'outbound' | 'inbound';

export interface SourcingSupplier {
  supplierId?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface CreateOrderPayload {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  orderDirection: OrderDirection;
  weight: string;
  declaredValue: string;
  description: string;
  shipmentType: 'air' | 'sea' | 'ocean';
  senderId?: string;
  pickupRepName?: string;
  pickupRepPhone?: string;
  sourcingSupplier?: SourcingSupplier;
}

export interface ApiOrder {
  id: string;
  trackingNumber: string;
  status?: string;
  statusV2: string;
  statusLabel: string;
  sourcingSupplierId: string | null;
  sourcingSupplierName: string | null;
  sourcingSupplierPhone: string | null;
  sourcingSupplierEmail: string | null;
  [key: string]: unknown;
}

export interface ApiCreateOrderResponse {
  success: boolean;
  message: string;
  data: ApiOrder;
}

export interface OrderListItem {
  id: string;
  trackingNumber: string;
  senderName?: string | null;
  status: string;
  statusV2: string;
  statusLabel: string;
  origin: string | null;
  destination: string | null;
  createdAt: string | null;
  amount: number | null;
  transportMode: string;
  paymentCollectionStatus: string;
  paymentDetailsSentAt?: string | null;
  flaggedForAdminReview: boolean;
  raw: Record<string, unknown>;
}

export interface OrdersListResult {
  data: OrderListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
