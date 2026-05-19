// Phase 4 — Public marketing types.
// Mirrors backend /public (non-gallery) responses.
// See global-express-backend/API_ENDPOINTS.md §Public.

export type PublicCalculatorShipmentType = 'air' | 'sea' | 'ocean' | 'd2d';

export interface PublicEstimatePayload {
  shipmentType: PublicCalculatorShipmentType;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  cbm?: number;
}

export interface PublicShippingEstimate {
  shipmentType?: string;
  mode: string;
  weightKg: number | null;
  cbm: number | null;
  estimatedCostUsd: number;
  departureFrequency: string;
  estimatedTransitDays: number;
  disclaimer: string;
  intake?: Record<string, unknown> | null;
  d2dIntake?: Record<string, unknown> | null;
  estimateDetails?: Record<string, unknown> | null;
}

export interface PublicShipmentTypeIntake {
  title: string;
  description?: string;
  submitEndpoint: string;
  requiredFields: string[];
  nextStep?: string | null;
}

export interface PublicShipmentType {
  key: string;
  label: string;
  coreShipmentType: 'air' | 'sea' | 'd2d';
  estimatorMode?: string;
  intake: PublicShipmentTypeIntake | null;
}

export interface PublicShipmentTypesResult {
  items: PublicShipmentType[];
  updatedAt: string;
}

export interface PublicCalculatorRateTier {
  minKg: number;
  maxKg: number;
  rateUsdPerKg: number;
}

export interface PublicCalculatorRates {
  air: {
    unit: 'kg';
    tiers: PublicCalculatorRateTier[];
  };
  sea: {
    unit: 'cbm';
    flatRateUsdPerCbm: number;
  };
}

export interface NewsletterSubscribePayload {
  email: string;
}

export interface NewsletterSubscribeResult {
  message: string;
}

export interface PublicD2dIntakePayload {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  goodsDescription: string;
  deliveryPhone: string;
  deliveryAddressLine1: string;
  deliveryState?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryLandmark?: string;
  wantsAccount: boolean;
  consentAcknowledgement: boolean;
  estimatedWeightKg: number;
  estimatedCbm: number;
}

export interface PublicD2dIntakeContact {
  userId?: string | null;
  role?: string | null;
  email: string;
  accountLinked: boolean;
  isActive?: boolean;
  registerIntent?: boolean;
}

export interface PublicD2dIntakeResult {
  ticket: { id: string; subject?: string | null };
  contact: PublicD2dIntakeContact;
  intakeRequest: Record<string, unknown>;
}
