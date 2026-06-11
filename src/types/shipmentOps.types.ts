// Phase 3 shipment ops — mirrors backend /shipments (intake, measurements,
// invoice attachments, internal tracking, dispatch-batch operations).
// See global-express-backend/API_ENDPOINTS.md §Shipments.

export type MeasurementCheckpoint = 'SK_WAREHOUSE' | 'AIRPORT' | 'NIGERIA_OFFICE';

export type ShipmentTransportMode = 'air' | 'sea';

export type IntakeShipmentType = 'air' | 'ocean' | 'd2d';

export type ShipmentPayer = 'USER' | 'SUPPLIER';

export type InvoiceAttachmentContentType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/webp';

export interface ShipmentIntakeGoodsLine {
  supplierId: string;
  description?: string;
  itemType?: string;
  quantity?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  cbm?: number;
  itemCostUsd?: number;
  requiresExtraTruckMovement?: boolean;
}

export interface ShipmentIntakePayload {
  shippingMark: string;
  mode: ShipmentTransportMode;
  shipmentType?: IntakeShipmentType;
  shipmentPayer?: ShipmentPayer;
  billingSupplierId?: string;
  goods: ShipmentIntakeGoodsLine[];
}

export interface ShipmentIntakeResult {
  id: string;
  trackingNumber: string;
  statusV2?: string | null;
  [key: string]: unknown;
}

export interface ShipmentMeasurementPayload {
  checkpoint: MeasurementCheckpoint;
  measuredWeightKg: number;
  measuredCbm: number;
  notes?: string;
}

export interface ShipmentMeasurement {
  id: string;
  shipmentId: string;
  checkpoint: MeasurementCheckpoint;
  measuredWeightKg: number;
  measuredCbm: number;
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceAttachmentPresignPayload {
  contentType: InvoiceAttachmentContentType;
  fileSizeBytes: number;
  originalFileName?: string;
}

export interface InvoiceAttachmentPresignResult {
  uploadUrl: string;
  r2Key: string;
  publicUrl?: string;
  expiresInSeconds?: number;
}

export interface InvoiceAttachmentConfirmPayload {
  r2Key: string;
  contentType: InvoiceAttachmentContentType;
  fileSizeBytes: number;
  originalFileName: string;
}

export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  type: 'TASK_INVOICE' | 'REGULATED_DOCUMENT';
  r2Key: string;
  publicUrl?: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface DispatchBatch {
  id: string;
  masterTrackingNumber?: string | null;
  status: string;
  carrierName?: string | null;
  airlineTrackingNumber?: string | null;
  oceanTrackingNumber?: string | null;
  d2dTrackingNumber?: string | null;
  voyageOrFlightNumber?: string | null;
  estimatedDepartureAt?: string | null;
  estimatedArrivalAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface DispatchBatchCarrierInfoPayload {
  carrierName?: string | null;
  airlineTrackingNumber?: string | null;
  oceanTrackingNumber?: string | null;
  d2dTrackingNumber?: string | null;
  voyageOrFlightNumber?: string | null;
  estimatedDepartureAt?: string | null;
  estimatedArrivalAt?: string | null;
  notes?: string | null;
}

export interface DispatchBatchStatusPayload {
  statusV2: string;
}

export interface DispatchBatchMoveToNextPayload {
  orderId: string;
  supplierId?: string;
  packageIds?: string[];
}
