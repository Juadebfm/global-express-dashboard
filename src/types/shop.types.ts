export type ShopInterestStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'hold_offered'
  | 'converted'
  | 'delivered'
  | 'closed';

export type ShopDeliveryMethod = 'pickup' | 'delivery';

export interface ShopInterestListingSummary {
  id: string;
  title: string;
  listingKind: 'vehicle' | 'general_item';
  status: 'draft' | 'published' | 'unpublished' | 'archived' | 'sold';
  trackingNumber: string;
}

export interface ShopInterestRequest {
  id: string;
  listingId: string;
  listing: ShopInterestListingSummary | null;
  source: 'public' | 'authenticated' | 'staff';
  status: ShopInterestStatus;
  assignedTo: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  staffNotes: string | null;
  deliveryMethod: ShopDeliveryMethod | null;
  deliveryAddress: string | null;
  contactedAt: string | null;
  qualifiedAt: string | null;
  convertedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateShopInterestRequestPayload {
  status?: ShopInterestStatus;
  assignedTo?: string | null;
  staffNotes?: string | null;
}
