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
  weight?: string;
  declaredValue: string;
  description: string;
  shipmentType: 'air' | 'sea' | 'ocean' | 'd2d';
  recipientAddress?: string;
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
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  recipientEmail?: string | null;
  origin?: string;
  destination?: string;
  description?: string | null;
  shipmentType?: 'air' | 'ocean' | 'd2d' | null;
  transportMode?: 'air' | 'sea' | null;
  weight?: string | null;
  declaredValue?: string | null;
  isPreorder?: boolean;
  warehouseId?: string | null;
  departureDate?: string | null;
  eta?: string | null;
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
  escalatedAt: string | null;
  escalationNote: string | null;
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

export type PricingSource = 'CUSTOMER_OVERRIDE' | 'DEFAULT_RATE';

export interface OrderEstimateResult {
  mode: 'air' | 'sea';
  weightKg: number | null;
  cbm: number | null;
  estimatedCostUsd: number;
  pricingSource: PricingSource;
  departureFrequency: string;
  estimatedTransitDays: number;
  disclaimer: string;
}

export type WarehousePricingQuotePayload =
  | { shipmentType: 'air'; weightKg: number; rateOwnerId?: string }
  | { shipmentType: 'ocean'; cbm: number; rateOwnerId?: string };

export interface WarehousePricingQuoteResult {
  estimatedCostUsd: number;
}
