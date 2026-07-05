// Phase 4 — Gallery + Public marketing types.
// Mirrors backend /gallery (staff) + /public/gallery (anonymous) responses.
// See global-express-backend/API_ENDPOINTS.md §Gallery + §Public.

export type GalleryItemType = 'anonymous_goods' | 'car' | 'advert';

export type GalleryItemStatus =
  | 'draft'
  | 'published'
  | 'claim_pending'
  | 'claimed'
  | 'car_reserved'
  | 'car_sold'
  | 'archived';

export interface GalleryItem {
  id: string;
  trackingNumberMasked: string;
  itemType: GalleryItemType;
  title: string;
  description?: string | null;
  previewImageUrl?: string | null;
  mediaUrls?: string[] | null;
  ctaUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: GalleryItemStatus;
  isPublished: boolean;
  carPriceNgn?: number | null;
  priceCurrency?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GalleryClaimType = 'ownership' | 'car_purchase';
export type GalleryClaimStatus = 'pending' | 'approved' | 'rejected';

export interface GalleryClaim {
  id: string;
  itemId: string;
  itemTrackingNumber: string;
  itemType: GalleryItemType;
  itemTitle: string;
  claimType: GalleryClaimType;
  status: GalleryClaimStatus;
  claimantUserId?: string | null;
  claimantFullName: string;
  claimantEmail: string;
  claimantPhone: string;
  message?: string | null;
  uploadToken?: string | null;
  proofUrls?: string[] | null;
  supportTicketId?: string | null;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryTicketStub {
  id: string;
  subject?: string | null;
}

export interface GalleryClaimSubmissionResult {
  item: GalleryItem;
  claim: GalleryClaim;
  ticket: GalleryTicketStub;
}

export interface GalleryClaimReviewShipment {
  orderId: string;
  orderTrackingNumber: string;
  dispatchBatchId?: string | null;
  dispatchMasterTrackingNumber?: string | null;
}

export interface GalleryClaimReviewResult {
  item: GalleryItem;
  claim: GalleryClaim;
  shipment: GalleryClaimReviewShipment | null;
}

export interface PublicGalleryListings {
  anonymousGoods: GalleryItem[];
  sales: GalleryItem[];
  cars: GalleryItem[];
  adverts: GalleryItem[];
}

export interface AuthedGalleryListings extends PublicGalleryListings {
  myClaims: GalleryClaim[];
}

export type GalleryUploadContentType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/webp';

export interface GalleryUploadPresignPayload {
  uploadToken?: string;
  contentType: GalleryUploadContentType;
  originalFileName?: string;
}

export interface GalleryUploadPresignResult {
  uploadUrl: string;
  r2Key: string;
  publicUrl?: string;
  expiresInSeconds?: number;
  uploadToken: string;
}

export interface AnonymousClaimPayload {
  itemId: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  message?: string;
  uploadToken: string;
  proofR2Keys: string[];
}

export interface AuthedClaimPayload {
  itemId: string;
  message?: string;
  uploadToken: string;
  proofR2Keys: string[];
}

export interface AnonymousCarPurchasePayload {
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  message?: string;
}

export interface AuthedCarPurchasePayload {
  message?: string;
}

export interface GalleryItemCreatePayload {
  itemType: GalleryItemType;
  title: string;
  description?: string;
  previewImageUrl?: string;
  mediaUrls?: string[];
  ctaUrl?: string;
  startsAt?: string;
  endsAt?: string;
  isPublished?: boolean;
  status?: GalleryItemStatus;
  carPriceNgn?: number;
  metadata?: Record<string, unknown>;
}

export type GalleryItemUpdatePayload = Partial<GalleryItemCreatePayload>;

export interface GalleryAdvertCreatePayload {
  title: string;
  description?: string;
  previewImageUrl?: string;
  mediaUrls?: string[];
  ctaUrl?: string;
  startsAt?: string;
  endsAt?: string;
  isPublished?: boolean;
  status?: GalleryItemStatus;
  metadata?: Record<string, unknown>;
}

export type GalleryAdvertUpdatePayload = Partial<GalleryAdvertCreatePayload>;

export interface GalleryClaimsQuery {
  status?: GalleryClaimStatus;
  claimType?: GalleryClaimType;
  itemTrackingNumber?: string;
  limit?: number;
  page?: number;
}

export interface GalleryClaimsPaginatedResult {
  data: GalleryClaim[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GalleryClaimReviewPayload {
  decision: 'approve' | 'reject';
  note?: string;
  postApprovalAction?: 'create_shipment' | 'approve_only';
  shipmentType?: 'air' | 'ocean' | 'd2d';
  d2dDispatchMode?: 'air' | 'sea';
}
