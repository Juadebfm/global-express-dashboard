import type {
  ShipmentsDashboardData,
  ShipmentRecord,
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

export async function getShipmentsDashboard(token: string): Promise<ShipmentsDashboardData> {
  const response = await apiGet<ApiShipmentsResponse>('/shipments?limit=100', token);
  const shipments = response.data.data.map(mapApiShipment);

  const inTransit = shipments.filter((s) => s.status === 'in_transit').length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const pending = shipments.filter((s) => s.status === 'pending').length;

  return {
    header: { title: 'Shipments', subtitle: 'Track and manage your shipments' },
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
