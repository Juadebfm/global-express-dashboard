import type {
  ShipmentsDashboardData,
  ShipmentRecord,
  ShipmentMode,
  ApiShipmentRecord,
  ApiShipmentsResponse,
} from '@/types';
import type { StatusCategory } from '@/types/status.types';
import { getStatusCategory } from '@/lib/statusUtils';
import { apiGet } from '@/lib/apiClient';

function mapApiShipment(s: ApiShipmentRecord): ShipmentRecord {
  return {
    id: s.id,
    sku: s.trackingNumber,
    customer: s.senderName,
    origin: s.origin,
    destination: s.destination,
    departureDate: s.departureDate,
    etaDate: s.eta,
    status: getStatusCategory(s.statusV2),
    statusV2: s.statusV2,
    statusLabel: s.statusLabel,
    mode: s.shipmentType,
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
    origin: origin || 'Unknown',
    destination: destination || 'Unknown',
    departureDate: firstString(item, ['departureDate', 'pickupDate', 'createdAt'], new Date().toISOString()),
    etaDate: firstString(item, ['eta', 'estimatedDelivery', 'deliveryDate', 'updatedAt'], new Date().toISOString()),
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
  headerSubtitle: string
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
  };
}

export async function getShipmentsDashboard(
  token: string,
  isCustomer = false
): Promise<ShipmentsDashboardData> {
  if (isCustomer) {
    const response = await apiGet<unknown>('/orders/my-shipments?page=1&limit=100', token);
    const shipments = extractMyShipmentItems(response).map(mapMyShipment);
    return buildShipmentsDashboardData(
      shipments,
      'My Shipments',
      'Track your orders and bulk shipment items'
    );
  }

  const response = await apiGet<ApiShipmentsResponse>('/shipments?limit=100', token);
  const shipments = response.data.data.map(mapApiShipment);

  return buildShipmentsDashboardData(
    shipments,
    'Shipments',
    'Track and manage your shipments'
  );
}
