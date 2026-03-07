export interface ShippingLane {
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  isLocked: boolean;
}

export interface LogisticsSettings {
  lane: string | ShippingLane;
  koreaOffice: string;
  lagosOffice: string;
  etaNotes: string;
}

export interface FxRateSettings {
  mode: 'live' | 'manual';
  manualRate: number;
  effectiveRate: number | null;
}

export interface PricingRule {
  id: string;
  name: string;
  mode: 'air' | 'sea';
  minWeightKg?: number;
  maxWeightKg?: number;
  rateUsdPerKg?: number;
  flatRateUsdPerCbm?: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CustomerPricingOverride {
  id: string;
  customerId: string;
  name: string;
  mode: 'air' | 'sea';
  minWeightKg?: number;
  maxWeightKg?: number;
  rateUsdPerKg?: number;
  flatRateUsdPerCbm?: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
}

export interface NotificationTemplate {
  id: string;
  templateKey: string;
  locale: string;
  channel: string;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface RestrictedGood {
  id: string;
  code: string;
  nameEn: string;
  nameKo: string;
  description: string;
  allowWithOverride: boolean;
  isActive: boolean;
}
