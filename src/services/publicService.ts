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
import { apiGetData, apiPostData } from '@/lib/apiClient';

// Phase 4 — backend /public/* routes that are NOT gallery-related.
// All endpoints here are unauthenticated — token argument is omitted.

function normalizeShipmentType(
  type: PublicEstimatePayload['shipmentType'],
): 'air' | 'sea' | 'd2d' {
  if (type === 'ocean') return 'sea';
  return type;
}

export function estimateShipping(
  payload: PublicEstimatePayload,
): Promise<PublicShippingEstimate> {
  const normalized = { ...payload, shipmentType: normalizeShipmentType(payload.shipmentType) };
  return apiPostData<PublicShippingEstimate>('/public/calculator/estimate', normalized);
}

export function getPublicShipmentTypes(): Promise<PublicShipmentTypesResult> {
  return apiGetData<PublicShipmentTypesResult>('/public/shipment-types');
}

export function getPublicCalculatorRates(): Promise<PublicCalculatorRates> {
  return apiGetData<PublicCalculatorRates>('/public/calculator/rates');
}

export function subscribeToNewsletter(
  payload: NewsletterSubscribePayload,
): Promise<NewsletterSubscribeResult> {
  return apiPostData<NewsletterSubscribeResult>('/public/newsletter/subscribe', payload);
}

export function submitPublicD2dIntake(
  payload: PublicD2dIntakePayload,
): Promise<PublicD2dIntakeResult> {
  return apiPostData<PublicD2dIntakeResult>('/public/d2d/intake', payload);
}
