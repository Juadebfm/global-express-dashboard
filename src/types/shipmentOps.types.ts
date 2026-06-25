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
  itemType?: string;
  description?: string;
  quantity?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  cbm?: number;
  itemCostUsd?: number;
  requiresExtraTruckMovement?: boolean;
  arrivalAt?: string;
  specialPackagingType?: string;
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

// Lightweight summary returned by GET /shipments/batches list endpoint.
export interface DispatchBatchListItem {
  id: string;
  masterTrackingNumber: string;
  transportMode: 'air' | 'sea';
  status: 'open' | 'cutoff_pending_approval' | 'closed';
  shipmentCount: number;
  carrierName: string | null;
  voyageOrFlightNumber: string | null;
  estimatedDepartureAt: string | null;
  createdAt: string;
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
  billOfLadingNumber?: string | null;
  vesselName?: string | null;
}

export interface DispatchBatchStatusPayload {
  statusV2: string;
}

export interface DispatchBatchMoveToNextPayload {
  orderId: string;
  supplierId?: string;
  packageIds?: string[];
}

// ── Batch document types ────────────────────────────────────────────────────

export type BatchDocumentType =
  | 'mawb'
  | 'bill_of_lading'
  | 'container_photo'
  | 'vessel_photo'
  | 'other';

export interface BatchDocument {
  id: string;
  batchId: string;
  documentType: BatchDocumentType;
  fileUrl: string;
  fileName: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface BatchDocumentPresignResult {
  uploadUrl: string;
  r2Key: string;
}

// ── New /api/v1/batches types ────────────────────────────────────────────────

export interface Batch {
  id: string;
  masterTrackingNumber: string;
  transportMode: 'air' | 'sea';
  transportLabel: string;
  status: 'open' | 'closed';
  statusLabel: string;
  carrierName: string | null;
  airlineTrackingNumber: string | null;
  oceanTrackingNumber: string | null;
  d2dTrackingNumber: string | null;
  voyageOrFlightNumber: string | null;
  estimatedDepartureAt: string | null;
  estimatedArrivalAt: string | null;
  closedAt: string | null;
  notes: string | null;
  billOfLadingNumber: string | null;
  vesselName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchListItem {
  id: string;
  masterTrackingNumber: string;
  transportMode: 'air' | 'sea';
  transportLabel: string;
  status: 'open' | 'closed';
  statusLabel: string;
  customerCount: number;
  orderCount: number;
  totalWeightKg: string;
}

export interface BatchListResult {
  batches: BatchListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface BatchRosterOrder {
  id: string;
  trackingNumber: string;
  status: string;
  statusLabel: string;
  description: string;
  weightKg: string;
  shipmentType: 'air' | 'd2d';
  shipmentTypeLabel: string;
  declaredValueUsd: string;
  createdAt: string;
}

export interface BatchRosterCustomer {
  slotId: string;
  customerId: string;
  customerName: string;
  shippingMark: string;
  batchTrackingNumber: string;
  orderCount: number;
  totalWeightKg: string;
  allVerified: boolean;
  orders: BatchRosterOrder[];
}

export interface BatchRosterSummary {
  totalCustomers: number;
  totalOrders: number;
  totalWeightKg: string;
  unverifiedOrders: number;
  canClose: boolean;
  shipmentTypeBreakdown: Record<string, number>;
  goodsTypeBreakdown: Record<string, number>;
}

export interface BatchRosterResult {
  batch: Batch;
  customers: BatchRosterCustomer[];
  summary: BatchRosterSummary;
}

export interface BatchStatusLabel {
  status: string;
  label: string;
  description: string;
}

export interface BatchAddOrderPayload {
  orderId: string;
}

export interface BatchAddOrderResult {
  ok: boolean;
  batchId: string;
  masterTrackingNumber: string;
  batchTrackingNumber: string;
  isNewSlot: boolean;
}

export interface BatchUpdateStatusPayload {
  status: string;
}

export interface BatchUpdateStatusResult {
  ok: boolean;
  updatedOrderCount: number;
  newStatus: string;
  statusLabel: string;
}

export interface BatchCloseResult {
  ok: boolean;
  closedBatch: Batch;
  nextBatch: Batch;
  customersNotified: number;
}
