import type {
  NewsletterSubscribePayload,
  NewsletterSubscribeResult,
  AccountAvailabilityPayload,
  AccountAvailabilityResult,
  PublicD2dIntakePayload,
  PublicD2dIntakeResult,
  PublicEstimatePayload,
  PublicShipmentTypesResult,
  PublicShippingEstimate,
} from '@/types';
import { apiGetData, apiPostData } from '@/lib/apiClient';

// Phase 4 — backend /public/* routes that are NOT gallery-related.
// All endpoints here are unauthenticated — token argument is omitted.

/**
 * The calculator accepts only `air | ocean | d2d` and rejects "sea" with a
 * 400, so the UI's "sea" is translated on the way out.
 */
function normalizeShipmentType(
  type: PublicEstimatePayload['shipmentType'],
): 'air' | 'ocean' | 'd2d' {
  if (type === 'sea') return 'ocean';
  return type;
}

export function estimateShipping(
  payload: PublicEstimatePayload,
): Promise<PublicShippingEstimate> {
  const normalized = { ...payload, shipmentType: normalizeShipmentType(payload.shipmentType) };
  return apiPostData<PublicShippingEstimate>('/public/calculator/estimate', normalized);
}

// Account reactivation — customer/supplier accounts within the 7-day window
// after DELETE /users/me or a superadmin-initiated deactivation.

export function requestAccountReactivationCode(email: string): Promise<{ message: string }> {
  return apiPostData<{ message: string }>('/public/account-reactivation/request-code', { email });
}

export function verifyAccountReactivationCode(
  email: string,
  code: string,
): Promise<{ message: string }> {
  return apiPostData<{ message: string }>('/public/account-reactivation/verify-code', { email, code });
}

export function getPublicShipmentTypes(): Promise<PublicShipmentTypesResult> {
  return apiGetData<PublicShipmentTypesResult>('/public/shipment-types');
}

export function checkAccountAvailability(
  payload: AccountAvailabilityPayload,
): Promise<AccountAvailabilityResult> {
  return apiPostData<AccountAvailabilityResult>('/public/account-availability', payload);
}

export function subscribeToNewsletter(
  payload: NewsletterSubscribePayload,
  turnstileToken: string,
): Promise<NewsletterSubscribeResult> {
  return apiPostData<NewsletterSubscribeResult>(
    '/public/newsletter/subscribe',
    payload,
    undefined,
    { turnstileToken },
  );
}

export function submitPublicD2dIntake(
  payload: PublicD2dIntakePayload,
  turnstileToken: string,
): Promise<PublicD2dIntakeResult> {
  return apiPostData<PublicD2dIntakeResult>(
    '/public/d2d/intake',
    payload,
    undefined,
    { turnstileToken },
  );
}
