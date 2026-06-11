import type {
  ShipmentsDashboardData,
  ShipmentRecord,
  ShipmentMode,
  ApiShipmentRecord,
  ApiShipmentsResponse,
  ShipmentIntakePayload,
  ShipmentIntakeResult,
  ShipmentMeasurement,
  ShipmentMeasurementPayload,
  InvoiceAttachment,
  InvoiceAttachmentPresignPayload,
  InvoiceAttachmentPresignResult,
  InvoiceAttachmentConfirmPayload,
  DispatchBatch,
  DispatchBatchListItem,
  DispatchBatchCarrierInfoPayload,
  DispatchBatchStatusPayload,
  DispatchBatchMoveToNextPayload,
} from '@/types';
import type { StatusCategory } from '@/types/status.types';
import { getStatusCategory } from '@/lib/statusUtils';
import {
  apiGet,
  apiGetData,
  apiPatchData,
  apiPostData,
  apiPutData,
} from '@/lib/apiClient';

export interface InternalShipmentsQueryParams {
  statusV2?: string;
  senderId?: string;
  page?: number;
  limit?: number;
}

function mapApiShipment(s: ApiShipmentRecord): ShipmentRecord {
  return {
    id: s.id,
    sku: s.trackingNumber,
    customer: s.senderName,
    createdAt: s.createdAt || null,
    origin: s.origin,
    destination: s.destination,
    departureDate: s.departureDate || null,
    etaDate: s.eta || null,
    status: getStatusCategory(s.statusV2),
    statusV2: s.statusV2,
    statusLabel: s.statusLabel,
    mode: parseMode(s.shipmentType),
    packageCount: Number(s.numberOfPackages) || 0,
    weightKg: parseFloat(s.weight) || 0,
    valueUSD: Number(s.declaredValue) || 0,
  };
}

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as AnyRecord;
}

function asRecordArray(value: unknown): AnyRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => !!asRecord(item)) as AnyRecord[];
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseMode(value: unknown): ShipmentMode {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'air') return 'air';
  return 'ocean';
}

function firstString(record: AnyRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = asString(record[key]);
    if (value) return value;
  }
  return fallback;
}

function firstNumber(record: AnyRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = asNumber(record[key], Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function extractMyShipmentItems(payload: unknown): AnyRecord[] {
  const root = asRecord(payload);
  if (!root) return [];

  const directCandidates = [
    root.data,
    root.items,
    root.shipments,
    root.orders,
    root.results,
  ];

  for (const candidate of directCandidates) {
    const rows = asRecordArray(candidate);
    if (rows.length > 0) return rows;
  }

  const dataRecord = asRecord(root.data);
  if (dataRecord) {
    const rows = [
      ...asRecordArray(dataRecord.data),
      ...asRecordArray(dataRecord.items),
      ...asRecordArray(dataRecord.orders),
      ...asRecordArray(dataRecord.shipments),
      ...asRecordArray(dataRecord.solo),
      ...asRecordArray(dataRecord.bulk),
      ...asRecordArray(dataRecord.bulkItems),
      ...asRecordArray(dataRecord.soloOrders),
      ...asRecordArray(dataRecord.bulkOrders),
    ];
    if (rows.length > 0) return rows;

    const flattenedArrays = Object.values(dataRecord).flatMap((value) =>
      asRecordArray(value)
    );
    if (flattenedArrays.length > 0) return flattenedArrays;
  }

  return [];
}

function mapMyShipment(item: AnyRecord, index: number): ShipmentRecord {
  const id =
    firstString(item, ['id', 'orderId', 'itemId', 'shipmentId']) ||
    `my-shipment-${index}`;

  const tracking = firstString(item, [
    'trackingNumber',
    'trackingNo',
    'tracking_code',
    'reference',
  ]);

  const origin = firstString(item, [
    'origin',
    'originAddress',
    'pickupAddress',
    'from',
  ]);
  const destination = firstString(item, [
    'destination',
    'destinationAddress',
    'recipientAddress',
    'to',
  ]);

  const statusV2 = firstString(item, ['statusV2', 'status_v2']);
  const statusLabel = firstString(item, ['statusLabel', 'status_label']);

  return {
    id,
    sku: tracking || id,
    customer: firstString(item, [
      'recipientName',
      'customerName',
      'senderName',
      'name',
    ], 'Customer'),
    createdAt: firstString(item, ['createdAt', 'created_at', 'date', 'updatedAt']) || null,
    origin: origin || 'Unknown',
    destination: destination || 'Unknown',
    departureDate: firstString(item, ['departureDate', 'pickupDate']) || null,
    etaDate: firstString(item, ['eta', 'estimatedDelivery', 'deliveryDate']) || null,
    status: statusV2 ? getStatusCategory(statusV2) : 'pending',
    statusV2,
    statusLabel,
    mode: parseMode(item.shipmentType ?? item.mode ?? item.transportMode),
    packageCount: firstNumber(item, ['numberOfPackages', 'packageCount', 'quantity', 'totalItems'], 1),
    weightKg: firstNumber(item, ['weightKg', 'weight', 'totalWeight'], 0),
    valueUSD: firstNumber(item, ['declaredValue', 'value', 'amount', 'totalValue'], 0),
  };
}

function buildShipmentsDashboardData(
  shipments: ShipmentRecord[],
  headerTitle: string,
  headerSubtitle: string,
  pagination: ShipmentsDashboardData['pagination'],
): ShipmentsDashboardData {

  const counts: Record<StatusCategory, number> = {
    pending: 0,
    active: 0,
    completed: 0,
    exception: 0,
  };

  for (const s of shipments) {
    counts[s.status] += 1;
  }

  return {
    header: { title: headerTitle, subtitle: headerSubtitle },
    summary: {
      overview: {
        title: 'Total Shipments',
        total: shipments.length,
        breakdown: [
          { id: 'pending', label: 'Pending', value: counts.pending, status: 'pending' },
          { id: 'active', label: 'Active', value: counts.active, status: 'active' },
          { id: 'completed', label: 'Completed', value: counts.completed, status: 'completed' },
          { id: 'exception', label: 'Exception', value: counts.exception, status: 'exception' },
        ],
      },
      metrics: [
        {
          id: 'totalWeight',
          title: 'Total Weight',
          value: shipments.reduce((acc, s) => acc + s.weightKg, 0),
          unit: 'kg',
          helperText: '',
          icon: 'weight',
        },
        {
          id: 'totalValue',
          title: 'Total Value',
          value: shipments.reduce((acc, s) => acc + s.valueUSD, 0),
          unit: 'USD',
          helperText: '',
          icon: 'value',
        },
        {
          id: 'totalItems',
          title: 'Total Items',
          value: shipments.reduce((acc, s) => acc + s.packageCount, 0),
          unit: '',
          helperText: '',
          icon: 'items',
        },
      ],
    },
    filters: [
      { id: 'all', label: 'All', value: 'all' },
      { id: 'pending', label: 'Pending', value: 'pending' },
      { id: 'active', label: 'Active', value: 'active' },
      { id: 'completed', label: 'Completed', value: 'completed' },
      { id: 'exception', label: 'Exception', value: 'exception' },
    ],
    table: { title: 'Shipment List' },
    shipments,
    pagination,
  };
}

// Pull { page, limit, total, totalPages } from an arbitrary BE response shape.
// Falls back to a single-page page-of-N when the server didn't surface
// pagination (older /orders/my-shipments shapes for legacy customers).
function extractPagination(
  payload: unknown,
  shipments: ShipmentRecord[],
  requestedPage: number,
  requestedLimit: number,
): ShipmentsDashboardData['pagination'] {
  const root = asRecord(payload);
  const candidate =
    asRecord(root?.pagination) ?? asRecord(asRecord(root?.data)?.pagination);

  if (candidate) {
    return {
      page: firstNumber(candidate, ['page'], requestedPage),
      limit: firstNumber(candidate, ['limit'], requestedLimit),
      total: firstNumber(candidate, ['total'], shipments.length),
      totalPages: firstNumber(candidate, ['totalPages'], 1),
    };
  }

  return {
    page: requestedPage,
    limit: requestedLimit,
    total: shipments.length,
    totalPages: Math.max(1, Math.ceil(shipments.length / requestedLimit)),
  };
}

// BE default is also 20 (max 100). We pick 20 explicitly here so the contract
// is visible at the call site instead of relying on the server default.
const DEFAULT_SHIPMENTS_PAGE_SIZE = 20;

export async function getShipmentsDashboard(
  token: string,
  isCustomer = false,
  params: InternalShipmentsQueryParams = {}
): Promise<ShipmentsDashboardData> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_SHIPMENTS_PAGE_SIZE;

  if (isCustomer) {
    const customerParams = new URLSearchParams();
    customerParams.set('page', String(page));
    customerParams.set('limit', String(limit));
    const response = await apiGet<unknown>(
      `/orders/my-shipments?${customerParams.toString()}`,
      token,
    );
    const shipments = extractMyShipmentItems(response).map(mapMyShipment);
    return buildShipmentsDashboardData(
      shipments,
      'My Shipments',
      'Track your orders and bulk shipment items',
      extractPagination(response, shipments, page, limit),
    );
  }

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (params.statusV2) searchParams.set('statusV2', params.statusV2);
  if (params.senderId) searchParams.set('senderId', params.senderId);

  const response = await apiGet<ApiShipmentsResponse>(`/shipments?${searchParams.toString()}`, token);
  const shipments = response.data.data.map(mapApiShipment);

  return buildShipmentsDashboardData(
    shipments,
    'Shipments',
    'Track and manage your shipments',
    {
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      total: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
    },
  );
}

// ── Phase 3: warehouse intake + measurements ─────────────────────────────────

export function recordShipmentIntake(
  token: string,
  payload: ShipmentIntakePayload,
): Promise<ShipmentIntakeResult> {
  return apiPostData<ShipmentIntakeResult>('/shipments/intake', payload, token);
}

export function recordShipmentMeasurement(
  token: string,
  shipmentId: string,
  payload: ShipmentMeasurementPayload,
): Promise<ShipmentMeasurement> {
  return apiPutData<ShipmentMeasurement>(
    `/shipments/${shipmentId}/measurements`,
    payload,
    token,
  );
}

export function getShipmentMeasurements(
  token: string,
  shipmentId: string,
): Promise<ShipmentMeasurement[]> {
  return apiGetData<ShipmentMeasurement[]>(`/shipments/${shipmentId}/measurements`, token);
}

// ── Phase 3: task invoices (per-supplier billing attachments) ────────────────

export function presignTaskInvoice(
  token: string,
  invoiceId: string,
  payload: InvoiceAttachmentPresignPayload,
): Promise<InvoiceAttachmentPresignResult> {
  return apiPostData<InvoiceAttachmentPresignResult>(
    `/shipments/invoices/${invoiceId}/task-invoice/presign`,
    payload,
    token,
  );
}

export function confirmTaskInvoice(
  token: string,
  invoiceId: string,
  payload: InvoiceAttachmentConfirmPayload,
): Promise<InvoiceAttachment> {
  return apiPostData<InvoiceAttachment>(
    `/shipments/invoices/${invoiceId}/task-invoice/confirm`,
    payload,
    token,
  );
}

export function getTaskInvoices(
  token: string,
  invoiceId: string,
): Promise<InvoiceAttachment[]> {
  return apiGetData<InvoiceAttachment[]>(
    `/shipments/invoices/${invoiceId}/task-invoice`,
    token,
  );
}

// ── Phase 3: regulatory docs (export permits, manifests) ─────────────────────

export function presignRegDoc(
  token: string,
  invoiceId: string,
  payload: InvoiceAttachmentPresignPayload,
): Promise<InvoiceAttachmentPresignResult> {
  return apiPostData<InvoiceAttachmentPresignResult>(
    `/shipments/invoices/${invoiceId}/reg-docs/presign`,
    payload,
    token,
  );
}

export function confirmRegDoc(
  token: string,
  invoiceId: string,
  payload: InvoiceAttachmentConfirmPayload,
): Promise<InvoiceAttachment> {
  return apiPostData<InvoiceAttachment>(
    `/shipments/invoices/${invoiceId}/reg-docs/confirm`,
    payload,
    token,
  );
}

export function getRegDocs(
  token: string,
  invoiceId: string,
): Promise<InvoiceAttachment[]> {
  return apiGetData<InvoiceAttachment[]>(`/shipments/invoices/${invoiceId}/reg-docs`, token);
}

// ── Phase 3: batch list ───────────────────────────────────────────────────────

export interface BatchListParams {
  status?: 'open' | 'cutoff_pending_approval' | 'closed';
  transportMode?: 'air' | 'sea';
  page?: number;
  limit?: number;
}

export interface BatchListResult {
  data: DispatchBatchListItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export function listDispatchBatches(
  token: string,
  params: BatchListParams = {},
): Promise<BatchListResult> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.transportMode) qs.set('transportMode', params.transportMode);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  return apiGetData<BatchListResult>(
    `/shipments/batches${qs.toString() ? `?${qs.toString()}` : ''}`,
    token,
  );
}

// ── Phase 3: internal tracking by master batch tracking number ───────────────

export function getDispatchBatchByMasterTracking(
  token: string,
  masterTrackingNumber: string,
): Promise<DispatchBatch> {
  return apiGetData<DispatchBatch>(
    `/shipments/internal-track/${encodeURIComponent(masterTrackingNumber)}`,
    token,
  );
}

// ── Phase 3: dispatch-batch operations ───────────────────────────────────────

export function approveDispatchBatchCutoff(
  token: string,
  batchId: string,
): Promise<DispatchBatch> {
  return apiPostData<DispatchBatch>(
    `/shipments/batches/${batchId}/approve-cutoff`,
    undefined,
    token,
  );
}

export function updateDispatchBatchCarrierInfo(
  token: string,
  batchId: string,
  payload: DispatchBatchCarrierInfoPayload,
): Promise<DispatchBatch> {
  return apiPatchData<DispatchBatch>(
    `/shipments/batches/${batchId}/carrier-info`,
    payload,
    token,
  );
}

export function updateDispatchBatchStatus(
  token: string,
  batchId: string,
  payload: DispatchBatchStatusPayload,
): Promise<DispatchBatch> {
  return apiPatchData<DispatchBatch>(
    `/shipments/batches/${batchId}/status`,
    payload,
    token,
  );
}

export function moveDispatchBatchToNext(
  token: string,
  batchId: string,
  payload: DispatchBatchMoveToNextPayload,
): Promise<DispatchBatch> {
  return apiPostData<DispatchBatch>(
    `/shipments/batches/${batchId}/move-to-next`,
    payload,
    token,
  );
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export async function downloadBatchManifest(
  token: string,
  batchId: string,
): Promise<Blob> {
  const response = await fetch(
    `${BASE_URL}/shipments/batches/${batchId}/manifest`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Failed to download manifest (${response.status})`);
  }
  return response.blob();
}
