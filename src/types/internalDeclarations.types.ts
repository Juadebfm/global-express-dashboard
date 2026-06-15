import type { DeclarationStatus, DeclarationShipmentType } from './supplierPortal.types';

export type { DeclarationStatus, DeclarationShipmentType };

export interface InternalDeclarationListItem {
  id: string;
  supplierId: string;
  supplierName: string | null;
  supplierBusinessName: string | null;
  description: string;
  shipmentType: DeclarationShipmentType;
  declaredValueUsd: string;
  status: DeclarationStatus;
  createdAt: string;
}

export interface InternalDeclaration extends InternalDeclarationListItem {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string | null;
  recipientAddress: string | null;
  quantity: number | null;
  estimatedWeightKg: string | null;
  specialPackagingNotes: string | null;
  supplierNotes: string | null;
  estimatedArrivalAt: string | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  orderId: string | null;
  linkedCustomerId: string | null;
  linkedBy: string | null;
  linkedAt: string | null;
  updatedAt: string;
}

export interface InternalDeclarationListParams {
  status?: DeclarationStatus;
  page?: number;
  limit?: number;
}

export interface RejectDeclarationPayload {
  reason: string;
}

export interface LinkCustomerPayload {
  customerId: string;
}

export interface InternalOrderSummary {
  id: string;
  trackingNumber: string;
}
