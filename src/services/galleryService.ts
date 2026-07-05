import type {
  AnonymousCarPurchasePayload,
  AnonymousClaimPayload,
  AuthedCarPurchasePayload,
  AuthedClaimPayload,
  AuthedGalleryListings,
  GalleryAdvertCreatePayload,
  GalleryAdvertUpdatePayload,
  GalleryClaimReviewPayload,
  GalleryClaimReviewResult,
  GalleryClaimsQuery,
  GalleryClaimsPaginatedResult,
  GalleryClaimSubmissionResult,
  GalleryItem,
  GalleryItemCreatePayload,
  GalleryItemUpdatePayload,
  GalleryUploadPresignPayload,
  GalleryUploadPresignResult,
  PublicGalleryListings,
} from '@/types';
import { apiGetData, apiPatchData, apiPostData } from '@/lib/apiClient';

// Phase 4 — both /public/gallery/* (anonymous) and /gallery/* (staff/authed).
// Grouped in one module because the only difference between the two route
// prefixes is permissions: same domain, same response shapes.

// ── Public (anonymous) gallery listings ──────────────────────────────────────

export function getPublicGallery(
  limitPerSection?: number,
): Promise<PublicGalleryListings> {
  const q = limitPerSection ? `?limitPerSection=${encodeURIComponent(limitPerSection)}` : '';
  return apiGetData<PublicGalleryListings>(`/public/gallery${q}`);
}

export function getPublicGalleryAdverts(limit?: number): Promise<GalleryItem[]> {
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  return apiGetData<GalleryItem[]>(`/public/gallery/adverts${q}`);
}

export function getPublicGallerySales(limit?: number): Promise<GalleryItem[]> {
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  return apiGetData<GalleryItem[]>(`/public/gallery/sales${q}`);
}

export function presignPublicGalleryClaim(
  payload: GalleryUploadPresignPayload,
  turnstileToken: string,
): Promise<GalleryUploadPresignResult> {
  return apiPostData<GalleryUploadPresignResult>(
    '/public/gallery/claims/presign',
    payload,
    undefined,
    { turnstileToken },
  );
}

export function submitPublicAnonymousClaim(
  trackingNumber: string,
  payload: AnonymousClaimPayload,
  turnstileToken: string,
): Promise<GalleryClaimSubmissionResult> {
  return apiPostData<GalleryClaimSubmissionResult>(
    `/public/gallery/anonymous/${encodeURIComponent(trackingNumber)}/claim`,
    payload,
    undefined,
    { turnstileToken },
  );
}

export function submitPublicCarPurchaseAttempt(
  trackingNumber: string,
  payload: AnonymousCarPurchasePayload,
  turnstileToken: string,
): Promise<GalleryClaimSubmissionResult> {
  return apiPostData<GalleryClaimSubmissionResult>(
    `/public/gallery/cars/${encodeURIComponent(trackingNumber)}/purchase-attempt`,
    payload,
    undefined,
    { turnstileToken },
  );
}

// ── Authenticated gallery (staff + signed-in users) ──────────────────────────

export function getAuthedGallery(
  token: string,
  limitPerSection?: number,
): Promise<AuthedGalleryListings> {
  const q = limitPerSection ? `?limitPerSection=${encodeURIComponent(limitPerSection)}` : '';
  return apiGetData<AuthedGalleryListings>(`/gallery${q}`, token);
}

export function presignGalleryClaim(
  token: string,
  payload: GalleryUploadPresignPayload,
): Promise<GalleryUploadPresignResult> {
  return apiPostData<GalleryUploadPresignResult>('/gallery/claims/presign', payload, token);
}

export function presignGalleryItemMedia(
  token: string,
  payload: GalleryUploadPresignPayload,
): Promise<GalleryUploadPresignResult> {
  return apiPostData<GalleryUploadPresignResult>(
    '/gallery/items/media/presign',
    payload,
    token,
  );
}

export function submitAuthedAnonymousClaim(
  token: string,
  trackingNumber: string,
  payload: AuthedClaimPayload,
): Promise<GalleryClaimSubmissionResult> {
  return apiPostData<GalleryClaimSubmissionResult>(
    `/gallery/anonymous/${encodeURIComponent(trackingNumber)}/claim`,
    payload,
    token,
  );
}

export function submitAuthedCarPurchaseAttempt(
  token: string,
  trackingNumber: string,
  payload: AuthedCarPurchasePayload,
): Promise<GalleryClaimSubmissionResult> {
  return apiPostData<GalleryClaimSubmissionResult>(
    `/gallery/cars/${encodeURIComponent(trackingNumber)}/purchase-attempt`,
    payload,
    token,
  );
}

export function createGalleryItem(
  token: string,
  payload: GalleryItemCreatePayload,
): Promise<GalleryItem> {
  return apiPostData<GalleryItem>('/gallery/items', payload, token);
}

export function createGalleryAdvert(
  token: string,
  payload: GalleryAdvertCreatePayload,
): Promise<GalleryItem> {
  return apiPostData<GalleryItem>('/gallery/adverts', payload, token);
}

export function updateGalleryItem(
  token: string,
  itemId: string,
  payload: GalleryItemUpdatePayload,
): Promise<GalleryItem> {
  return apiPatchData<GalleryItem>(
    `/gallery/items/${encodeURIComponent(itemId)}`,
    payload,
    token,
  );
}

export function updateGalleryAdvert(
  token: string,
  itemId: string,
  payload: GalleryAdvertUpdatePayload,
): Promise<GalleryItem> {
  return apiPatchData<GalleryItem>(
    `/gallery/adverts/${encodeURIComponent(itemId)}`,
    payload,
    token,
  );
}

export function getGalleryClaims(
  token: string,
  query: GalleryClaimsQuery = {},
): Promise<GalleryClaimsPaginatedResult> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.claimType) params.set('claimType', query.claimType);
  if (query.itemTrackingNumber) params.set('itemTrackingNumber', query.itemTrackingNumber);
  if (typeof query.limit === 'number') params.set('limit', String(query.limit));
  if (typeof query.page === 'number') params.set('page', String(query.page));
  const qs = params.toString();
  const path = qs ? `/gallery/claims?${qs}` : '/gallery/claims';
  return apiGetData<GalleryClaimsPaginatedResult>(path, token);
}

export function reviewGalleryClaim(
  token: string,
  claimId: string,
  payload: GalleryClaimReviewPayload,
): Promise<GalleryClaimReviewResult> {
  return apiPatchData<GalleryClaimReviewResult>(
    `/gallery/claims/${encodeURIComponent(claimId)}/review`,
    payload,
    token,
  );
}
