export interface WarehousePackage {
  description?: string;
  itemType?: string;
  quantity?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  cbm?: number;
  isRestricted?: boolean;
  restrictedReason?: string | null;
  restrictedOverrideApproved?: boolean;
  restrictedOverrideReason?: string | null;
}

export interface WarehouseVerifyPayload {
  transportMode: 'air' | 'sea';
  packages: WarehousePackage[];
  manualFinalChargeUsd?: number;
  manualAdjustmentReason?: string;
}
