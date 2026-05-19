import type {
  NewsletterSubscribePayload,
  NewsletterSubscribeResult,
  PublicCalculatorRates,
  PublicD2dIntakePayload,
  PublicD2dIntakeResult,
  PublicEstimatePayload,
  PublicShipmentTypesResult,
  PublicShippingEstimate,
} from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

// Phase 4 — backend /public/* routes that are NOT gallery-related.
// Gallery routes (whether under /public/gallery or /gallery) live in
// galleryService.ts because their split is a permission detail, not a
// separate route file in our FE surface.
// All endpoints here are unauthenticated — apiGet/apiPost are called
// without a token so no Authorization header is sent.

interface Envelope<T> {
  success: boolean;
  data: T;
}

function normalizeShipmentType(
  type: PublicEstimatePayload['shipmentType'],
): 'air' | 'sea' | 'd2d' {
  if (type === 'ocean') return 'sea';
  return type;
}

export async function estimateShipping(
  payload: PublicEstimatePayload,
): Promise<PublicShippingEstimate> {
  const normalized = { ...payload, shipmentType: normalizeShipmentType(payload.shipmentType) };
  const response = await apiPost<Envelope<PublicShippingEstimate>>(
    '/public/calculator/estimate',
    normalized,
  );
  return response.data;
}

export async function getPublicShipmentTypes(): Promise<PublicShipmentTypesResult> {
  const response = await apiGet<Envelope<PublicShipmentTypesResult>>(
    '/public/shipment-types',
  );
  return response.data;
}

export async function getPublicCalculatorRates(): Promise<PublicCalculatorRates> {
  const response = await apiGet<Envelope<PublicCalculatorRates>>(
    '/public/calculator/rates',
  );
  return response.data;
}

export async function subscribeToNewsletter(
  payload: NewsletterSubscribePayload,
): Promise<NewsletterSubscribeResult> {
  const response = await apiPost<Envelope<NewsletterSubscribeResult>>(
    '/public/newsletter/subscribe',
    payload,
  );
  return response.data;
}

export async function submitPublicD2dIntake(
  payload: PublicD2dIntakePayload,
): Promise<PublicD2dIntakeResult> {
  const response = await apiPost<Envelope<PublicD2dIntakeResult>>(
    '/public/d2d/intake',
    payload,
  );
  return response.data;
}
