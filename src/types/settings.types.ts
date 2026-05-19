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

export interface SpecialPackagingType {
  id?: string;
  type: string;
  label: string;
  description?: string;
  surchargeUsd?: number;
  isActive?: boolean;
}

export interface ShipmentTypeCatalogItem {
  key: string;
  label: string;
  isActive: boolean;
  coreShipmentType: 'air' | 'ocean' | 'd2d';
  estimatorMode: 'CALCULATED' | 'INTAKE';
  infoTitle?: string | null;
  infoDescription?: string | null;
  submitEndpoint?: string | null;
  requiredFields?: string[];
  nextStep?: string | null;
}

export interface ShipmentTypesCatalogResult {
  items: ShipmentTypeCatalogItem[];
  updatedAt: string;
}

export interface ShipmentTypesUpdatePayload {
  items?: ShipmentTypeCatalogItem[];
  deleteKeys?: string[];
}

export interface ShipmentTypesUpdateResult {
  summary: {
    createdKeys: string[];
    updatedKeys: string[];
    deletedKeys: string[];
  };
  items: ShipmentTypeCatalogItem[];
  updatedAt: string;
}
