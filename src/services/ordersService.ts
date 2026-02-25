import type {
  ApiCreateOrderResponse,
  ApiOrder,
  CreateOrderPayload,
  OrderListItem,
  OrdersListResult,
} from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

export async function createOrder(
  payload: CreateOrderPayload,
  token: string
): Promise<ApiOrder> {
  const response = await apiPost<ApiCreateOrderResponse>('/orders', payload, token);
  return response.data;
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

function firstRecordArray(candidates: unknown[]): AnyRecord[] {
  for (const candidate of candidates) {
    const rows = asRecordArray(candidate);
    if (rows.length > 0) return rows;
  }
  return [];
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstString(record: AnyRecord, keys: string[]): string | null {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(record: AnyRecord, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function extractOrderRows(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return asRecordArray(payload);

  const root = asRecord(payload);
  if (!root) return [];

  const directRows = firstRecordArray([root.data, root.items, root.orders, root.results]);
  if (directRows.length > 0) return directRows;

  const dataRecord = asRecord(root.data);
  if (dataRecord) {
    const nestedRows = firstRecordArray([
      dataRecord.data,
      dataRecord.items,
      dataRecord.orders,
      dataRecord.results,
    ]);
    if (nestedRows.length > 0) return nestedRows;

    const flattenedNested = Object.values(dataRecord).flatMap((value) =>
      asRecordArray(value)
    );
    if (flattenedNested.length > 0) return flattenedNested;
  }

  const flattened = Object.values(root).flatMap((value) => asRecordArray(value));
  if (flattened.length > 0) return flattened;

  return [];
}

function mapOrderRow(row: AnyRecord, index: number): OrderListItem {
  const id = firstString(row, ['id', '_id', 'orderId']) ?? `order-${index + 1}`;
  const trackingNumber =
    firstString(row, ['trackingNumber', 'trackingNo', 'reference', 'code']) ?? id;

  return {
    id,
    trackingNumber,
    status: firstString(row, ['status', 'orderStatus', 'shipmentStatus']) ?? 'pending',
    origin: firstString(row, ['origin', 'originAddress', 'pickupAddress', 'from']),
    destination: firstString(row, [
      'destination',
      'destinationAddress',
      'recipientAddress',
      'to',
    ]),
    createdAt: firstString(row, ['createdAt', 'created_at', 'date', 'updatedAt']),
    amount: firstNumber(row, ['amount', 'declaredValue', 'value', 'total']),
    raw: row,
  };
}

function toPositiveInt(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.floor(value);
}

function extractPagination(
  payload: unknown,
  count: number,
  requestedPage: number,
  requestedLimit: number
): OrdersListResult['pagination'] {
  const root = asRecord(payload);
  const dataRecord = root ? asRecord(root.data) : null;
  const pagination =
    asRecord(root?.pagination) ??
    asRecord(dataRecord?.pagination) ??
    asRecord(root?.meta) ??
    asRecord(dataRecord?.meta);

  const total =
    toPositiveInt(pagination ? firstNumber(pagination, ['total', 'count', 'itemCount']) : null) ??
    count;

  const page =
    toPositiveInt(pagination ? firstNumber(pagination, ['page', 'currentPage']) : null) ??
    Math.max(1, requestedPage);

  const limit =
    toPositiveInt(pagination ? firstNumber(pagination, ['limit', 'perPage', 'pageSize']) : null) ??
    Math.max(1, requestedLimit);

  const totalPages =
    toPositiveInt(pagination ? firstNumber(pagination, ['totalPages', 'pages']) : null) ??
    Math.max(1, Math.ceil(total / limit));

  return { total, page, limit, totalPages };
}

export async function getOrders(
  token: string,
  page = 1,
  limit = 100
): Promise<OrdersListResult> {
  const response = await apiGet<unknown>(`/orders?page=${page}&limit=${limit}`, token);
  const orders = extractOrderRows(response).map(mapOrderRow);

  return {
    data: orders,
    pagination: extractPagination(response, orders.length, page, limit),
  };
}
