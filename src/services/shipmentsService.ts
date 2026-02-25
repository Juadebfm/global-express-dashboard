import type {
  ShipmentsDashboardData,
  ShipmentRecord,
  ShipmentMode,
  ShipmentPriority,
  ShipmentStatus,
  ApiShipmentRecord,
  ApiShipmentsResponse,
} from '@/types';
import { apiGet } from '@/lib/apiClient';

function mapStatus(beStatus: ApiShipmentRecord['status']): ShipmentStatus {
  switch (beStatus) {
    case 'in_transit':
    case 'picked_up':
    case 'out_for_delivery':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    default:
      return 'pending';
  }
}

function mapApiShipment(s: ApiShipmentRecord): ShipmentRecord {
  return {
    id: s.id,
    sku: s.trackingNumber,
    customer: s.senderName,
    origin: s.origin,
    destination: s.destination,
    departureDate: s.departureDate,
    etaDate: s.eta,
    status: mapStatus(s.status),
    mode: s.shipmentType,
    priority: s.priority,
    packageCount: s.numberOfPackages,
    weightKg: parseFloat(s.weight) || 0,
    valueUSD: s.declaredValue,
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
  if (normalized === 'ocean' || normalized === 'sea') return 'ocean';
  return 'road';
}

function parsePriority(value: unknown): ShipmentPriority {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'express') return 'express';
  if (normalized === 'economy') return 'economy';
  return 'standard';
}

function parseStatus(value: unknown): ShipmentStatus {
  const normalized = asString(value).trim().toLowerCase().replace(/[\s-]/g, '_');
  if (normalized === 'delivered') return 'delivered';
  if (
    normalized === 'in_transit' ||
    normalized === 'picked_up' ||
    normalized === 'out_for_delivery' ||
    normalized === 'processing' ||
    normalized === 'shipped' ||
    normalized === 'on_route'
  ) {
    return 'in_transit';
  }
  return 'pending';
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
    status: parseStatus(item.status),
    mode: parseMode(item.shipmentType ?? item.mode ?? item.transportMode),
    priority: parsePriority(item.priority),
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

  const inTransit = shipments.filter((s) => s.status === 'in_transit').length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const pending = shipments.filter((s) => s.status === 'pending').length;

  return {
    header: { title: headerTitle, subtitle: headerSubtitle },
    summary: {
      overview: {
        title: 'Total Shipments',
        total: shipments.length,
        breakdown: [
          { id: 'in-transit', label: 'In Transit', value: inTransit, status: 'in_transit' },
          { id: 'delivered', label: 'Delivered', value: delivered, status: 'delivered' },
          { id: 'pending', label: 'Pending', value: pending, status: 'pending' },
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
      { id: 'in_transit', label: 'In Transit', value: 'in_transit' },
      { id: 'delivered', label: 'Delivered', value: 'delivered' },
      { id: 'pending', label: 'Pending', value: 'pending' },
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
