export type OrderDirection = 'outbound' | 'inbound';

export interface CreateOrderPayload {
  recipientName: string;
  recipientAddress: string;
  recipientPhone: string;
  recipientEmail: string;
  origin: string;
  destination: string;
  orderDirection: OrderDirection;
  weight: string;
  declaredValue: string;
  description: string;
  senderId?: string;
}

export interface ApiOrder {
  id: string;
  trackingNumber: string;
  status?: string;
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
  status: string;
  origin: string | null;
  destination: string | null;
  createdAt: string | null;
  amount: number | null;
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
