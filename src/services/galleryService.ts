import type {
  AnonymousCarPurchasePayload,
  AnonymousClaimPayload,
  AuthedCarPurchasePayload,
  AuthedClaimPayload,
  AuthedGalleryListings,
  GalleryAdvertCreatePayload,
  GalleryAdvertUpdatePayload,
  GalleryClaim,
  GalleryClaimReviewPayload,
  GalleryClaimReviewResult,
  GalleryClaimsQuery,
  GalleryClaimSubmissionResult,
  GalleryItem,
  GalleryItemCreatePayload,
  GalleryItemUpdatePayload,
  GalleryUploadPresignPayload,
  GalleryUploadPresignResult,
  PublicGalleryListings,
} from '@/types';
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';

// Phase 4 — both /public/gallery/* (anonymous) and /gallery/* (staff/authed).
// Grouped in one module because the only difference between the two route
// prefixes is permissions: same domain, same response shapes.

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ── Public (anonymous) gallery listings ──────────────────────────────────────

export async function getPublicGallery(
  limitPerSection?: number,
): Promise<PublicGalleryListings> {
  const q = limitPerSection ? `?limitPerSection=${encodeURIComponent(limitPerSection)}` : '';
  const response = await apiGet<Envelope<PublicGalleryListings>>(`/public/gallery${q}`);
  return response.data;
}

export async function getPublicGalleryAdverts(limit?: number): Promise<GalleryItem[]> {
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  const response = await apiGet<Envelope<GalleryItem[]>>(`/public/gallery/adverts${q}`);
  return response.data;
}

export async function getPublicGallerySales(limit?: number): Promise<GalleryItem[]> {
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  const response = await apiGet<Envelope<GalleryItem[]>>(`/public/gallery/sales${q}`);
  return response.data;
}

export async function presignPublicGalleryClaim(
  payload: GalleryUploadPresignPayload,
): Promise<GalleryUploadPresignResult> {
  const response = await apiPost<Envelope<GalleryUploadPresignResult>>(
    '/public/gallery/claims/presign',
    payload,
  );
  return response.data;
}

export async function submitPublicAnonymousClaim(
  trackingNumber: string,
  payload: AnonymousClaimPayload,
): Promise<GalleryClaimSubmissionResult> {
  const response = await apiPost<Envelope<GalleryClaimSubmissionResult>>(
    `/public/gallery/anonymous/${encodeURIComponent(trackingNumber)}/claim`,
    payload,
  );
  return response.data;
}

export async function submitPublicCarPurchaseAttempt(
  trackingNumber: string,
  payload: AnonymousCarPurchasePayload,
): Promise<GalleryClaimSubmissionResult> {
  const response = await apiPost<Envelope<GalleryClaimSubmissionResult>>(
    `/public/gallery/cars/${encodeURIComponent(trackingNumber)}/purchase-attempt`,
    payload,
  );
  return response.data;
}

// ── Authenticated gallery (staff + signed-in users) ──────────────────────────

export async function getAuthedGallery(
  token: string,
  limitPerSection?: number,
): Promise<AuthedGalleryListings> {
  const q = limitPerSection ? `?limitPerSection=${encodeURIComponent(limitPerSection)}` : '';
  const response = await apiGet<Envelope<AuthedGalleryListings>>(`/gallery${q}`, token);
  return response.data;
}

export async function presignGalleryClaim(
  token: string,
  payload: GalleryUploadPresignPayload,
): Promise<GalleryUploadPresignResult> {
  const response = await apiPost<Envelope<GalleryUploadPresignResult>>(
    '/gallery/claims/presign',
    payload,
    token,
  );
  return response.data;
}

export async function presignGalleryItemMedia(
  token: string,
  payload: GalleryUploadPresignPayload,
): Promise<GalleryUploadPresignResult> {
  const response = await apiPost<Envelope<GalleryUploadPresignResult>>(
    '/gallery/items/media/presign',
    payload,
    token,
  );
  return response.data;
}

export async function submitAuthedAnonymousClaim(
  token: string,
  trackingNumber: string,
  payload: AuthedClaimPayload,
): Promise<GalleryClaimSubmissionResult> {
  const response = await apiPost<Envelope<GalleryClaimSubmissionResult>>(
    `/gallery/anonymous/${encodeURIComponent(trackingNumber)}/claim`,
    payload,
    token,
  );
  return response.data;
}

export async function submitAuthedCarPurchaseAttempt(
  token: string,
  trackingNumber: string,
  payload: AuthedCarPurchasePayload,
): Promise<GalleryClaimSubmissionResult> {
  const response = await apiPost<Envelope<GalleryClaimSubmissionResult>>(
    `/gallery/cars/${encodeURIComponent(trackingNumber)}/purchase-attempt`,
    payload,
    token,
  );
  return response.data;
}

export async function createGalleryItem(
  token: string,
  payload: GalleryItemCreatePayload,
): Promise<GalleryItem> {
  const response = await apiPost<Envelope<GalleryItem>>('/gallery/items', payload, token);
  return response.data;
}

export async function createGalleryAdvert(
  token: string,
  payload: GalleryAdvertCreatePayload,
): Promise<GalleryItem> {
  const response = await apiPost<Envelope<GalleryItem>>('/gallery/adverts', payload, token);
  return response.data;
}

export async function updateGalleryItem(
  token: string,
  itemId: string,
  payload: GalleryItemUpdatePayload,
): Promise<GalleryItem> {
  const response = await apiPatch<Envelope<GalleryItem>>(
    `/gallery/items/${encodeURIComponent(itemId)}`,
    payload,
    token,
  );
  return response.data;
}

export async function updateGalleryAdvert(
  token: string,
  itemId: string,
  payload: GalleryAdvertUpdatePayload,
): Promise<GalleryItem> {
  const response = await apiPatch<Envelope<GalleryItem>>(
    `/gallery/adverts/${encodeURIComponent(itemId)}`,
    payload,
    token,
  );
  return response.data;
}

export async function getGalleryClaims(
  token: string,
  query: GalleryClaimsQuery = {},
): Promise<GalleryClaim[]> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.claimType) params.set('claimType', query.claimType);
  if (query.itemTrackingNumber) params.set('itemTrackingNumber', query.itemTrackingNumber);
  if (typeof query.limit === 'number') params.set('limit', String(query.limit));
  const qs = params.toString();
  const path = qs ? `/gallery/claims?${qs}` : '/gallery/claims';
  const response = await apiGet<Envelope<GalleryClaim[]>>(path, token);
  return response.data;
}

export async function reviewGalleryClaim(
  token: string,
  claimId: string,
  payload: GalleryClaimReviewPayload,
): Promise<GalleryClaimReviewResult> {
  const response = await apiPatch<Envelope<GalleryClaimReviewResult>>(
    `/gallery/claims/${encodeURIComponent(claimId)}/review`,
    payload,
    token,
  );
  return response.data;
}
