export interface WarehousePackage {
  description?: string;
  itemType?: string;
  quantity?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  cbm?: number;
  specialPackagingType?: string;
  isRestricted?: boolean;
  restrictedReason?: string | null;
  restrictedOverrideApproved?: boolean;
  restrictedOverrideReason?: string | null;
}

export interface WarehouseVerifyPayload {
  transportMode: 'air' | 'sea';
  departureDate?: string;
  packages: WarehousePackage[];
  manualFinalChargeUsd?: number;
  manualAdjustmentReason?: string;
}
