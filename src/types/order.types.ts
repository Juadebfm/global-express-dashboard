export type OrderDirection = 'outbound' | 'inbound';

export interface CreateOrderPayload {
  recipientName: string;
  // recipientAddress omitted — hardcoded to Lagos office on the backend
  recipientPhone: string;
  recipientEmail: string;
  orderDirection: OrderDirection;
  weight: string;        // format: "10kg" (air) or "0.5cbm" (sea)
  declaredValue: string; // string, not number
  description: string;
  shipmentType: 'air' | 'sea' | 'ocean';
  // departureDate/eta omitted — set by warehouse staff only, not customers
  senderId?: string;     // required when staff creates on behalf of a customer
  pickupRepName?: string;
  pickupRepPhone?: string;
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
