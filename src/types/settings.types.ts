export interface ShippingLane {
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  isLocked: boolean;
}

export interface OfficeInfo {
  nameEn: string;
  nameKo: string;
  addressEn: string;
  addressKo: string;
  phone: string;
}

export interface EtaNotes {
  airLeadTimeNote: string;
  seaLeadTimeNote: string;
}

export interface LogisticsSettings {
  lane: ShippingLane;
  koreaOffice: OfficeInfo;
  lagosOffice: OfficeInfo;
  etaNotes: EtaNotes;
  updatedAt: string;
}

export interface FxRateSettings {
  mode: 'live' | 'manual';
  manualRate: number | null;
  effectiveRate: number | null;
  updatedAt?: string;
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
  mode: 'air' | 'sea';
  minWeightKg: string | null;
  maxWeightKg: string | null;
  rateUsdPerKg: string | null;
  flatRateUsdPerCbm: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
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

export interface BankAccountEntry {
  currency: string;
  accountNumber: string;
}

export interface BankInfo {
  bankName: string;
  accounts: BankAccountEntry[];
}

export interface BankAccountSettings {
  beneficiaryName: string;
  banks: BankInfo[];
  updatedAt: string | null;
}

export interface UpdateBankAccountsPayload {
  beneficiaryName?: string;
  banks: BankInfo[];
}

export interface PricingRulesResponse {
  defaultRules: PricingRule[];
  customerOverrides: CustomerPricingOverride[];
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
