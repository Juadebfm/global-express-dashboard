export type OrderDirection = 'outbound' | 'inbound';

export interface CreateOrderPayload {
  recipientName: string;
  recipientAddress: string;
  recipientPhone: string;
  recipientEmail: string;
  orderDirection: OrderDirection;
  weight: string;
  declaredValue: string;
  description: string;
  shipmentType: 'air' | 'ocean';
  departureDate?: string;
  eta?: string;
  senderId?: string;
}

export interface ApiOrder {
  id: string;
  trackingNumber: string;
  status?: string;
  statusV2: string;
  statusLabel: string;
  isPreorder: boolean;
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
  statusV2: string;
  statusLabel: string;
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
