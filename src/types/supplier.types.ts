// Supplier address book — mirrors backend /users/me/suppliers* and /users/suppliers
// (see global-express-backend/API_ENDPOINTS.md, sections "Users" and "Admin").

export type SupplierSource = 'saved' | 'used' | 'saved_and_used';

export interface ApiSupplier {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  shippingMark?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  addressPostalCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedCustomersCount?: number;
  lastLinkedAt?: string | null;
  shipmentUsageCount?: number;
  lastShipmentUsedAt?: string | null;
  source?: SupplierSource;
  savedAt?: string | null;
  usageCount?: number;
  lastUsedAt?: string | null;
}

export type SupplierUpdateRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ApiSupplierUpdateRequest {
  id: string;
  supplierId: string;
  requestedBy: string;
  status: SupplierUpdateRequestStatus;
  proposedFirstName?: string | null;
  proposedLastName?: string | null;
  proposedBusinessName?: string | null;
  proposedPhone?: string | null;
  proposedEmail?: string | null;
  note?: string | null;
  reviewerNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Pick<ApiSupplier, 'id' | 'displayName' | 'email'>;
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface SupplierUpdateRequestListParams {
  page?: number;
  limit?: number;
  status?: SupplierUpdateRequestStatus;
}

export interface AddSupplierPayload {
  supplierId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
}

export interface AddSupplierResult {
  supplier: ApiSupplier;
  createdSupplier: boolean;
  linkedNow: boolean;
}

export interface SupplierUpdateRequestPayload {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface SupplierValidationDecisionPayload {
  isTrue: boolean;
  note?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedSuppliers {
  data: ApiSupplier[];
  pagination: Pagination;
}

export interface PaginatedSupplierUpdateRequests {
  data: ApiSupplierUpdateRequest[];
  pagination: Pagination;
}
