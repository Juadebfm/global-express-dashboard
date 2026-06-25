export interface SupplierPortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  mustCompleteProfile: boolean;
}

export type DeclarationStatus = 'pending_review' | 'accepted' | 'rejected';
export type DeclarationShipmentType = 'air' | 'ocean' | 'd2d';

export interface Declaration {
  id: string;
  supplierId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string | null;
  recipientAddress: string | null;
  description: string;
  quantity: number | null;
  declaredValueUsd: string;
  estimatedWeightKg: string | null;
  shipmentType: DeclarationShipmentType;
  specialPackagingNotes: string | null;
  supplierNotes: string | null;
  estimatedArrivalAt: string | null;
  status: DeclarationStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  orderId: string | null;
  linkedCustomerId: string | null;
  linkedBy: string | null;
  linkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewDeclarationPayload {
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientAddress?: string;
  description: string;
  quantity?: number;
  declaredValueUsd: number;
  estimatedWeightKg?: number;
  shipmentType: DeclarationShipmentType;
  specialPackagingNotes?: string;
  supplierNotes?: string;
  estimatedArrivalAt?: string;
}

export interface DeclarationListParams {
  status?: DeclarationStatus;
  page?: number;
  limit?: number;
}

export interface SupplierOrderRequest {
  id: string;
  description: string | null;
  weight: string | null;
  declaredValue: string | null;
  shipmentType: 'air' | 'ocean' | 'd2d' | null;
  statusV2: string | null;
  sourcingSupplierName: string | null;
  sourcingSupplierPhone: string | null;
  sourcingSupplierEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
