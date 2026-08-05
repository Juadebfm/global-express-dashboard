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
  /** Optional on the API. Omit when blank — an empty string fails .email(). */
  recipientEmail?: string;
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
  /**
   * Customer-only. A staff account sending this is rejected with 403, so the
   * staff-facing form must never populate it.
   */
  customerDeclaredParcels?: CustomerDeclaredParcelInput[];
}

/**
 * Measurements a customer supplies before their goods reach the Korea
 * warehouse — "here is what's coming". Warehouse staff still weigh and measure
 * everything on arrival, and only those numbers set the price. These are kept
 * separately as the record of what the customer told us, and are never
 * overwritten.
 *
 * The four measurements arrive as fixed-precision strings, not numbers: two
 * decimal places for the lengths, three for the weight. Any one may be null.
 */
export interface CustomerDeclaredParcel {
  id: string;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  weightKg: string | null;
  /**
   * Who supplied the figures — set from the token that created the order, not
   * a client input. A claim about goods that have not arrived carries
   * different weight depending on who made it.
   */
  declaredSource: 'customer' | 'staff';
  /** A finished sentence naming the source — print it as-is. */
  staffDescription: string;
  createdAt: string;
  updatedAt: string;
}

/** Sent as numbers. At least one measurement is required per parcel. */
export interface CustomerDeclaredParcelInput {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
}

/**
 * A number replaces the stored value, null clears that one field, and an
 * omitted field is left alone. At least one key is required.
 */
export interface CustomerDeclaredParcelPatch {
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
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
  /**
   * Present on POST /orders and GET /orders/:id only — deliberately absent
   * from the list endpoints, so load the single order when you need it.
   */
  customerDeclaredParcels?: CustomerDeclaredParcel[];
  /**
   * Totals of what the customer said is coming, for queue views — null when
   * they declared nothing. Advance information only, never a basis for charge.
   * Unlike the parcel list, this rides on the order list responses too.
   */
  customerDeclaredSummary?: {
    parcelCount: number;
    totalWeightKg: string;
    totalCbm: string;
  } | null;
  /**
   * Whether the customer may still add, edit or remove their parcels. Gate the
   * controls on this and never derive it: a customer sees statusV2 remapped to
   * a coarser taxonomy where PREORDER_SUBMITTED and AWAITING_WAREHOUSE_RECEIPT
   * are the same value, so any local check is wrong in one direction or the
   * other. Served on POST /orders and GET /orders/:id only.
   */
  customerDeclaredParcelsEditable?: boolean;
  invoice?: { id: string; invoiceNumber: string; status: string } | null;
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
  /** Present on list responses so a queue can show what is expected without opening each order. */
  customerDeclaredSummary?: {
    parcelCount: number;
    totalWeightKg: string;
    totalCbm: string;
  } | null;
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
  /** True when the figure came from parcel measurements rather than a bare weight or volume. */
  derivedFromParcels?: boolean;
  parcelCount?: number;
}

export type WarehousePricingQuotePayload =
  | { shipmentType: 'air'; weightKg: number; rateOwnerId?: string }
  | { shipmentType: 'ocean'; cbm: number; rateOwnerId?: string };

export interface WarehousePricingQuoteResult {
  estimatedCostUsd: number;
}
