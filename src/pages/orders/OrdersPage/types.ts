import type { ApiOrder, WarehousePackage } from '@/types';
import { resolveLocation } from '@/utils';

// ── Status labels (authoritative — from BE status-transitions.ts) ───────────

export const STATUS_LABELS: Record<string, string> = {
  PREORDER_SUBMITTED:                     'Pre-Order Submitted',
  AWAITING_WAREHOUSE_RECEIPT:             'Awaiting Warehouse Receipt',
  WAREHOUSE_RECEIVED:                     'Received at Warehouse',
  CLAIM_APPROVED_PENDING_BULK_PROCESSING: 'Claim Approved — Pending Bulk Processing',
  WAREHOUSE_VERIFIED_PRICED:              'Verified & Priced',
  DISPATCHED_TO_ORIGIN_AIRPORT:           'Dispatched to Airport',
  AT_ORIGIN_AIRPORT:                      'At Origin Airport',
  BOARDED_ON_FLIGHT:                      'Boarded on Flight',
  FLIGHT_DEPARTED:                        'Flight Departed',
  FLIGHT_LANDED_LAGOS:                    'Landed in Lagos',
  DISPATCHED_TO_ORIGIN_PORT:              'Dispatched to Port',
  AT_ORIGIN_PORT:                         'At Origin Port',
  LOADED_ON_VESSEL:                       'Loaded on Vessel',
  VESSEL_DEPARTED:                        'Vessel Departed',
  VESSEL_ARRIVED_LAGOS_PORT:              'Arrived at Lagos Port',
  CUSTOMS_CLEARED_LAGOS:                  'Customs Cleared',
  IN_TRANSIT_TO_LAGOS_OFFICE:             'In Transit to Office',
  IN_EXTRA_TRUCK_MOVEMENT_LAGOS:          'In Extra Truck Movement (Lagos)',
  READY_FOR_PICKUP:                       'Ready for Pickup',
  PICKED_UP_COMPLETED:                    'Delivered',
  LOCAL_COURIER_ASSIGNED:                 'Local Courier Assigned',
  IN_TRANSIT_TO_DESTINATION_CITY:         'In Transit to Destination City',
  OUT_FOR_DELIVERY_DESTINATION_CITY:      'Out for Delivery',
  DELIVERED_TO_RECIPIENT:                 'Delivered to Recipient',
  ON_HOLD:                                'On Hold',
  CANCELLED:                              'Cancelled',
  RESTRICTED_ITEM_REJECTED:              'Restricted Item – Rejected',
  RESTRICTED_ITEM_OVERRIDE_APPROVED:     'Restricted Item – Override Approved',
};

// ── Status flows (authoritative — from BE status-transitions.ts) ────────────

// Full ordered flows — warehouse stages prepended so nextStatus works from
// any point in the lifecycle.
const SHARED_INTAKE: readonly string[] = [
  'PREORDER_SUBMITTED',
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
  'WAREHOUSE_VERIFIED_PRICED',
];

export const AIR_FLOW: readonly string[] = [
  ...SHARED_INTAKE,
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
];

export const SEA_FLOW: readonly string[] = [
  ...SHARED_INTAKE,
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
];

// D2D replaces PICKED_UP_COMPLETED with a door-to-door delivery tail.
// IN_EXTRA_TRUCK_MOVEMENT_LAGOS is optional (can be skipped by operators).
export const D2D_AIR_FLOW: readonly string[] = [
  ...SHARED_INTAKE,
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'LOCAL_COURIER_ASSIGNED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
];

export const D2D_SEA_FLOW: readonly string[] = [
  ...SHARED_INTAKE,
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'LOCAL_COURIER_ASSIGNED',
  'IN_TRANSIT_TO_DESTINATION_CITY',
  'OUT_FOR_DELIVERY_DESTINATION_CITY',
  'DELIVERED_TO_RECIPIENT',
];

export const EXCEPTION_STATUSES = new Set([
  'ON_HOLD',
  'CANCELLED',
  'RESTRICTED_ITEM_REJECTED',
  'RESTRICTED_ITEM_OVERRIDE_APPROVED',
]);

// ── 5-stage pipeline model (FE-owned grouping) ──────────────────────────────

export interface PipelineStage {
  index: number;   // 1-based
  label: string;
}

const STAGE_MAP: Array<{ label: string; statuses: string[] }> = [
  {
    label: 'Pre-order',
    statuses: ['PREORDER_SUBMITTED', 'AWAITING_WAREHOUSE_RECEIPT'],
  },
  {
    label: 'Warehouse',
    statuses: [
      'WAREHOUSE_RECEIVED',
      'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
      'WAREHOUSE_VERIFIED_PRICED',
    ],
  },
  {
    label: 'In transit',
    statuses: [
      'DISPATCHED_TO_ORIGIN_AIRPORT', 'AT_ORIGIN_AIRPORT', 'BOARDED_ON_FLIGHT',
      'FLIGHT_DEPARTED', 'DISPATCHED_TO_ORIGIN_PORT', 'AT_ORIGIN_PORT',
      'LOADED_ON_VESSEL', 'VESSEL_DEPARTED',
    ],
  },
  {
    label: 'Arrival',
    statuses: [
      'FLIGHT_LANDED_LAGOS', 'VESSEL_ARRIVED_LAGOS_PORT',
      'CUSTOMS_CLEARED_LAGOS', 'IN_TRANSIT_TO_LAGOS_OFFICE',
      'IN_EXTRA_TRUCK_MOVEMENT_LAGOS',
    ],
  },
  {
    label: 'Delivery',
    statuses: [
      'READY_FOR_PICKUP', 'PICKED_UP_COMPLETED',
      'LOCAL_COURIER_ASSIGNED', 'IN_TRANSIT_TO_DESTINATION_CITY',
      'OUT_FOR_DELIVERY_DESTINATION_CITY', 'DELIVERED_TO_RECIPIENT',
    ],
  },
];

export const TOTAL_STAGES = STAGE_MAP.length;

export function getStageInfo(statusV2: string): PipelineStage {
  for (let i = 0; i < STAGE_MAP.length; i++) {
    if (STAGE_MAP[i].statuses.includes(statusV2)) {
      return { index: i + 1, label: STAGE_MAP[i].label };
    }
  }
  return { index: 1, label: 'Pre-order' };
}

export function getNextStageLabel(statusV2: string): string | null {
  const stage = getStageInfo(statusV2);
  return STAGE_MAP[stage.index]?.label ?? null; // stage.index is 1-based → next 0-based entry
}

// ── Operator filters (queue left panel) ────────────────────────────────────

export const OPERATOR_FILTERS = ['all', 'needs_action'] as const;
export type OperatorFilter = (typeof OPERATOR_FILTERS)[number];

// ── Needs-action logic ──────────────────────────────────────────────────────

export function needsAction(
  statusV2: string,
  paymentCollectionStatus: string,
  flaggedForAdminReview: boolean,
): boolean {
  const s = statusV2.toUpperCase();
  if (s === 'WAREHOUSE_RECEIVED' || s === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') return true;
  if (paymentCollectionStatus.toUpperCase() === 'PAYMENT_IN_PROGRESS') return true;
  if (flaggedForAdminReview) return true;
  return false;
}

// ── Queue badge helpers ─────────────────────────────────────────────────────

export function hasVerifyBadge(statusV2: string): boolean {
  const s = statusV2.toUpperCase();
  return s === 'WAREHOUSE_RECEIVED' || s === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING';
}

export function hasUnpaidBadge(paymentCollectionStatus: string): boolean {
  const s = paymentCollectionStatus.toUpperCase();
  return s === 'UNPAID' || s === 'PAYMENT_IN_PROGRESS';
}

// ── Advance-button block reason ─────────────────────────────────────────────

export type AdvanceBlockReason = 'verify_first' | 'payment_required' | null;

export function getAdvanceBlockReason(
  statusV2: string,
  paymentCollectionStatus: string,
): AdvanceBlockReason {
  const s = statusV2.toUpperCase();
  if (s === 'WAREHOUSE_RECEIVED' || s === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING') {
    return 'verify_first';
  }
  if (s === 'READY_FOR_PICKUP' && paymentCollectionStatus.toUpperCase() !== 'PAID_IN_FULL') {
    return 'payment_required';
  }
  return null;
}

// ── Types ───────────────────────────────────────────────────────────────────

export type DetailTab = 'overview' | 'warehouse' | 'measurements' | 'payment' | 'images' | 'timeline';

export type Mode = 'air' | 'sea' | 'd2d' | '';

// ── Order view model ────────────────────────────────────────────────────────

export interface OrderView {
  id: string;
  trackingNumber: string;
  statusV2: string;
  statusLabel: string;
  senderId: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  shipmentType: Mode;
  transportMode: Mode;
  contentDescription: string;
  declaredValue: number | null;
  paymentCollectionStatus: string;
  totalPaidUsd: number | null;
  amountDue: number | null;
  estimatedChargeUsd: string | null;
  finalChargeUsd: number | null;
  paymentNote: string | null;
  pricingSource: string;
  pickupRepName: string;
  pickupRepPhone: string;
  createdAt: string;
  origin: string;
  destination: string;
  flaggedForAdminReview: boolean;
  paymentDetailsSentAt: string | null;
  dispatchBatchId: string | null;
}

// ── Package form ────────────────────────────────────────────────────────────

export interface PackageForm {
  id: number;
  description: string;
  itemType: string;
  quantity: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
  cbm: string;
  specialPackagingType: string;
  isRestricted: boolean;
  restrictedReason: string;
  restrictedOverrideApproved: boolean;
  restrictedOverrideReason: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function pick(record: AnyRecord | null, keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}

function readString(record: AnyRecord | null, keys: string[]): string {
  const value = pick(record, keys);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

function readNumber(record: AnyRecord | null, keys: string[]): number | null {
  const value = pick(record, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(record: AnyRecord | null, keys: string[]): boolean {
  const value = pick(record, keys);
  return value === true;
}

function parseMode(value: unknown): Mode {
  if (typeof value !== 'string') return '';
  const normalized = value.toLowerCase().trim();
  if (normalized === 'air') return 'air';
  if (normalized === 'sea' || normalized === 'ocean') return 'sea';
  if (normalized === 'd2d') return 'd2d';
  return '';
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parsePositive(value: string): number | undefined {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function newPackageForm(id: number): PackageForm {
  return {
    id,
    description: '',
    itemType: '',
    quantity: '1',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightKg: '',
    cbm: '',
    specialPackagingType: '',
    isRestricted: false,
    restrictedReason: '',
    restrictedOverrideApproved: false,
    restrictedOverrideReason: '',
  };
}

export function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function toView(order: ApiOrder): OrderView {
  const record = asRecord(order) ?? {};
  const senderRaw = pick(record, ['sender', 'customer', 'user']);
  const sender = asRecord(senderRaw);
  const shipmentType = parseMode(pick(record, ['shipmentType']));
  const transportMode = parseMode(pick(record, ['transportMode'])) || shipmentType;
  return {
    id: readString(record, ['id', 'orderId']) || order.id,
    trackingNumber: readString(record, ['trackingNumber']) || order.trackingNumber,
    statusV2: readString(record, ['statusV2']) || order.statusV2,
    statusLabel: readString(record, ['statusLabel']) || order.statusLabel,
    senderId: readString(record, ['senderId', 'userId', 'customerId']) || readString(sender, ['id']),
    senderName: (
      `${readString(sender, ['firstName'])} ${readString(sender, ['lastName'])}`.trim()
      || readString(sender, ['name', 'fullName'])
      || readString(record, ['senderName', 'customerName'])
      || (typeof senderRaw === 'string' ? senderRaw.trim() : '')
    ),
    recipientName: readString(record, ['recipientName']),
    recipientPhone: readString(record, ['recipientPhone']),
    recipientAddress: resolveLocation(pick(record, ['recipientAddress'])),
    shipmentType,
    transportMode,
    contentDescription: readString(record, ['description', 'contentDescription', 'contents']),
    declaredValue: readNumber(record, ['declaredValue']),
    paymentCollectionStatus: readString(record, ['paymentCollectionStatus']),
    totalPaidUsd: readNumber(record, ['totalPaidUsd']),
    amountDue: readNumber(record, ['amountDue']),
    estimatedChargeUsd: readString(record, ['estimatedChargeUsd']) || null,
    finalChargeUsd: readNumber(record, ['finalChargeUsd']),
    paymentNote: readString(record, ['paymentNote']) || null,
    pricingSource: readString(record, ['pricingSource']),
    pickupRepName: readString(record, ['pickupRepName']),
    pickupRepPhone: readString(record, ['pickupRepPhone']),
    createdAt: readString(record, ['createdAt']),
    origin: resolveLocation(pick(record, ['origin', 'originAddress'])) || 'Unknown',
    destination: resolveLocation(pick(record, ['destination', 'destinationAddress', 'recipientAddress'])) || 'Unknown',
    flaggedForAdminReview: readBoolean(record, ['flaggedForAdminReview']),
    paymentDetailsSentAt: readString(record, ['paymentDetailsSentAt']) || null,
    dispatchBatchId: readString(record, ['dispatchBatchId']) || null,
  };
}

// ── Flow selection ──────────────────────────────────────────────────────────

export function getFlow(transportMode: Mode, shipmentType: Mode): readonly string[] {
  const mode = transportMode || shipmentType;
  if (mode === 'd2d') return D2D_AIR_FLOW; // default D2D to air; refine if BE adds d2d-sea
  if (mode === 'sea') return SEA_FLOW;
  return AIR_FLOW;
}

export function nextStatus(current: string, mode: Mode, shipmentType?: Mode): string | null {
  if (EXCEPTION_STATUSES.has(current)) return null;
  const flow = getFlow(mode, shipmentType ?? '');
  const index = flow.indexOf(current);
  if (index < 0) return null;
  return flow[index + 1] ?? null;
}

export function mapPackageForm(pkg: PackageForm): WarehousePackage {
  return {
    description: pkg.description.trim() || undefined,
    itemType: pkg.itemType.trim() || undefined,
    quantity: parsePositiveInt(pkg.quantity),
    lengthCm: parsePositive(pkg.lengthCm),
    widthCm: parsePositive(pkg.widthCm),
    heightCm: parsePositive(pkg.heightCm),
    weightKg: parsePositive(pkg.weightKg),
    cbm: parsePositive(pkg.cbm),
    specialPackagingType: pkg.specialPackagingType || undefined,
    isRestricted: pkg.isRestricted,
    restrictedReason: pkg.isRestricted ? (pkg.restrictedReason.trim() || undefined) : undefined,
    restrictedOverrideApproved: pkg.isRestricted ? pkg.restrictedOverrideApproved : undefined,
    restrictedOverrideReason: pkg.isRestricted && pkg.restrictedOverrideApproved
      ? (pkg.restrictedOverrideReason.trim() || undefined)
      : undefined,
  };
}

export function includesQuery(
  row: {
    trackingNumber: string;
    senderName?: string | null;
    statusV2: string;
    statusLabel: string;
    origin: string | null;
    destination: string | null;
  },
  query: string
): boolean {
  if (!query.trim()) return true;
  const haystack = `${row.trackingNumber} ${row.senderName ?? ''} ${row.statusV2} ${row.statusLabel} ${row.origin ?? ''} ${row.destination ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase().trim());
}

export function isWarehouseVerifiable(statusV2: string): boolean {
  return statusV2 === 'WAREHOUSE_RECEIVED' || statusV2 === 'CLAIM_APPROVED_PENDING_BULK_PROCESSING';
}

// Statuses after warehouse-verify but still pre-departure — re-verify is
// allowed to add/replace packages and reprice. Once the batch departs
// (FLIGHT_DEPARTED / VESSEL_DEPARTED) the window closes.
const RE_VERIFY_STATUSES = new Set([
  'WAREHOUSE_VERIFIED_PRICED',
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
]);

export function canReVerifyPackages(statusV2: string): boolean {
  return RE_VERIFY_STATUSES.has(statusV2);
}

// Statuses where staff can still add packages to this shipment.
// PREORDER_SUBMITTED / AWAITING_WAREHOUSE_RECEIPT → first warehouse verify.
// WAREHOUSE_VERIFIED_PRICED → re-verify (last window before batch departs).
const ADD_TO_SHIPMENT_STATUSES = new Set([
  'PREORDER_SUBMITTED',
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'WAREHOUSE_VERIFIED_PRICED',
]);

export function canAddToShipment(statusV2: string): boolean {
  return ADD_TO_SHIPMENT_STATUSES.has(statusV2);
}

export function isPaymentRelevant(paymentCollectionStatus: string): boolean {
  return paymentCollectionStatus.toUpperCase() !== 'PAID_IN_FULL';
}

// Pricing source human label
const PRICING_SOURCE_LABELS: Record<string, string> = {
  DEFAULT_RATE:          'Standard rate',
  CUSTOMER_OVERRIDE:     'Customer override',
  MIGRATED_UNVERIFIED:   'Migrated (unverified)',
};

export function pricingSourceLabel(source: string): string {
  return PRICING_SOURCE_LABELS[source] ?? source;
}
