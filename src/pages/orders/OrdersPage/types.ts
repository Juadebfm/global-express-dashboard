import type { ApiOrder, WarehousePackage } from '@/types';
import { resolveLocation } from '@/utils';

// ── Status flow constants ───────────────────────────────────────

export const OPERATOR_FILTERS = [
  'all',
  'PREORDER_SUBMITTED',
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'WAREHOUSE_VERIFIED_PRICED',
] as const;

export const EXCEPTION_STATUSES = [
  'ON_HOLD',
  'CANCELLED',
  'RESTRICTED_ITEM_REJECTED',
  'RESTRICTED_ITEM_OVERRIDE_APPROVED',
] as const;

export const AIR_FLOW = [
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
] as const;

export const SEA_FLOW = [
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
] as const;

export const PIPELINE_PHASES = [
  { key: 'preorder', statuses: ['PREORDER_SUBMITTED', 'AWAITING_WAREHOUSE_RECEIPT'] },
  { key: 'warehouse', statuses: ['WAREHOUSE_RECEIVED', 'WAREHOUSE_VERIFIED_PRICED'] },
  { key: 'transit', statuses: [
    'DISPATCHED_TO_ORIGIN_AIRPORT', 'AT_ORIGIN_AIRPORT', 'BOARDED_ON_FLIGHT', 'FLIGHT_DEPARTED',
    'DISPATCHED_TO_ORIGIN_PORT', 'AT_ORIGIN_PORT', 'LOADED_ON_VESSEL', 'VESSEL_DEPARTED',
  ] },
  { key: 'arrival', statuses: [
    'FLIGHT_LANDED_LAGOS', 'VESSEL_ARRIVED_LAGOS_PORT', 'CUSTOMS_CLEARED_LAGOS', 'IN_TRANSIT_TO_LAGOS_OFFICE',
  ] },
  { key: 'delivery', statuses: ['READY_FOR_PICKUP', 'PICKED_UP_COMPLETED'] },
] as const;

export type DetailTab = 'overview' | 'warehouse' | 'payment' | 'pickup' | 'timeline';

export type Mode = 'air' | 'sea' | '';

export type OperatorFilter = (typeof OPERATOR_FILTERS)[number];

// ── Order view model ────────────────────────────────────────────

export interface OrderView {
  id: string;
  trackingNumber: string;
  statusV2: string;
  statusLabel: string;
  senderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  shipmentType: Mode;
  transportMode: Mode;
  paymentCollectionStatus: string;
  amountDue: number | null;
  finalChargeUsd: number | null;
  pricingSource: string;
  pickupRepName: string;
  pickupRepPhone: string;
  createdAt: string;
  origin: string;
  destination: string;
}

// ── Package form ────────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────

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

function parseMode(value: unknown): Mode {
  if (typeof value !== 'string') return '';
  const normalized = value.toLowerCase().trim();
  if (normalized === 'air') return 'air';
  if (normalized === 'sea' || normalized === 'ocean') return 'sea';
  return '';
}

export function statusLabel(status: string): string {
  return status
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
  const sender = asRecord(pick(record, ['sender', 'customer', 'user']));
  const shipmentType = parseMode(pick(record, ['shipmentType']));
  const transportMode = parseMode(pick(record, ['transportMode'])) || shipmentType;
  return {
    id: readString(record, ['id', 'orderId']) || order.id,
    trackingNumber: readString(record, ['trackingNumber']) || order.trackingNumber,
    statusV2: readString(record, ['statusV2']) || order.statusV2,
    statusLabel: readString(record, ['statusLabel']) || order.statusLabel,
    senderId: readString(record, ['senderId', 'userId', 'customerId']) || readString(sender, ['id']),
    recipientName: readString(record, ['recipientName']),
    recipientPhone: readString(record, ['recipientPhone']),
    recipientAddress: resolveLocation(pick(record, ['recipientAddress'])),
    shipmentType,
    transportMode,
    paymentCollectionStatus: readString(record, ['paymentCollectionStatus']),
    amountDue: readNumber(record, ['amountDue']),
    finalChargeUsd: readNumber(record, ['finalChargeUsd']),
    pricingSource: readString(record, ['pricingSource']),
    pickupRepName: readString(record, ['pickupRepName']),
    pickupRepPhone: readString(record, ['pickupRepPhone']),
    createdAt: readString(record, ['createdAt']),
    origin: resolveLocation(pick(record, ['origin', 'originAddress'])) || 'Unknown',
    destination: resolveLocation(pick(record, ['destination', 'destinationAddress', 'recipientAddress'])) || 'Unknown',
  };
}

export function nextStatus(current: string, mode: Mode): string | null {
  if (current === 'PREORDER_SUBMITTED') return 'AWAITING_WAREHOUSE_RECEIPT';
  if (current === 'AWAITING_WAREHOUSE_RECEIPT') return 'WAREHOUSE_RECEIVED';
  if (current === 'WAREHOUSE_VERIFIED_PRICED') {
    if (mode === 'air') return 'DISPATCHED_TO_ORIGIN_AIRPORT';
    if (mode === 'sea') return 'DISPATCHED_TO_ORIGIN_PORT';
  }
  const airIndex = AIR_FLOW.indexOf(current as (typeof AIR_FLOW)[number]);
  if (airIndex >= 0) return AIR_FLOW[airIndex + 1] ?? null;
  const seaIndex = SEA_FLOW.indexOf(current as (typeof SEA_FLOW)[number]);
  if (seaIndex >= 0) return SEA_FLOW[seaIndex + 1] ?? null;
  return null;
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

export function getCurrentPhaseIndex(statusV2: string): number {
  for (let i = 0; i < PIPELINE_PHASES.length; i++) {
    if ((PIPELINE_PHASES[i].statuses as readonly string[]).includes(statusV2)) return i;
  }
  return -1;
}

export function isWarehouseVerifiable(statusV2: string): boolean {
  return statusV2 === 'WAREHOUSE_RECEIVED';
}

export function isPaymentRelevant(paymentCollectionStatus: string): boolean {
  return paymentCollectionStatus.toUpperCase() !== 'PAID_IN_FULL';
}
