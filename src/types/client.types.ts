export interface ApiClientOrder {
  id: string;
  trackingNumber: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface ApiClient {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  businessName?: string | null;
  email: string | null;
  phone: string | null;
  whatsappNumber?: string | null;
  shippingMark: string | null;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressPostalCode?: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: string;
  lastOrderDate: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: ApiClientOrder[];
}

export interface CreateClientPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
}

export interface CreateDormantClientPayload {
  firstName?: string;
  lastName?: string;
  phone: string;
  shippingMark: string;
  whatsappNumber?: string;
  email?: string;
  addressCity?: string;
}

export interface CreateDormantClientResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingMark: string | null;
  isActive: false;
  createdAt: string;
}

export interface UpdateClientPayload {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  shippingMark?: string;
  addressCity?: string;
}

export interface ApiClientsResponse {
  success: boolean;
  message: string;
  data: {
    data: ApiClient[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// /admin/clients/:id/workbench — single page-load response combining
// client detail + suppliers + recent orders. Mirrors backend shape.

export interface WorkbenchPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientWorkbenchData<TSupplier, TOrder> {
  client: ApiClient;
  suppliers: TSupplier[];
  suppliersPagination: WorkbenchPagination;
  recentOrders: TOrder[];
  recentOrdersPagination: WorkbenchPagination;
}

// /admin/clients/:id/goods-intake payload — staff creates an order for a
// client with full package detail in one call.

export type GoodsIntakeShipmentType = 'air' | 'ocean' | 'd2d';
export type GoodsIntakeOrderDirection = 'outbound' | 'inbound';
export type GoodsIntakeTransportMode = 'air' | 'sea';
export type GoodsIntakeShipmentPayer = 'USER' | 'SUPPLIER';

export interface GoodsIntakePackage {
  supplierId?: string;
  arrivalAt?: string;
  description?: string;
  itemType?: string;
  quantity: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  cbm?: number;
  itemCostUsd?: number;
  requiresExtraTruckMovement?: boolean;
  specialPackagingType?: string;
  isRestricted?: boolean;
  restrictedReason?: string;
  restrictedOverrideApproved?: boolean;
  restrictedOverrideReason?: string;
}

export interface CreateGoodsIntakePayload {
  shipmentType?: GoodsIntakeShipmentType;
  orderDirection?: GoodsIntakeOrderDirection;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  description?: string;
  shipmentPayer?: GoodsIntakeShipmentPayer;
  billingSupplierId?: string;
  transportMode?: GoodsIntakeTransportMode;
  departureDate?: string;
  packages: GoodsIntakePackage[];
}
