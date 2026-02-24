export type ShipmentStatus = 'in_transit' | 'pending' | 'delivered';

export type ShipmentMode = 'air' | 'ocean' | 'road';

export type ShipmentPriority = 'standard' | 'express' | 'economy';

export interface ShipmentStatusSummary {
  id: string;
  label: string;
  value: number;
  status: ShipmentStatus;
}

export interface ShipmentOverviewCard {
  title: string;
  total: number;
  breakdown: ShipmentStatusSummary[];
}

export interface ShipmentMetricCard {
  id: string;
  title: string;
  value: number;
  unit: string;
  helperText: string;
  icon: 'weight' | 'value' | 'items';
}

export interface ShipmentFilterTab {
  id: string;
  label: string;
  value: ShipmentStatus | 'all';
}

export interface ShipmentRecord {
  id: string;
  sku: string;
  customer: string;
  origin: string;
  destination: string;
  departureDate: string;
  etaDate: string;
  status: ShipmentStatus;
  mode: ShipmentMode;
  priority: ShipmentPriority;
  packageCount: number;
  weightKg: number;
  valueUSD: number;
}

export interface ShipmentsDashboardData {
  header: {
    title: string;
    subtitle: string;
  };
  summary: {
    overview: ShipmentOverviewCard;
    metrics: ShipmentMetricCard[];
  };
  filters: ShipmentFilterTab[];
  table: {
    title: string;
  };
  shipments: ShipmentRecord[];
}

// ── Raw API types ─────────────────────────────────────────────────────────────

export type ApiShipmentStatus =
  | 'in_transit'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'pending'
  | 'cancelled'
  | 'returned';

export interface ApiShipmentRecord {
  id: string;
  trackingNumber: string;
  senderName: string;
  origin: string;
  destination: string;
  departureDate: string;
  eta: string;
  status: ApiShipmentStatus;
  shipmentType: 'air' | 'ocean' | 'road';
  priority: ShipmentPriority;
  numberOfPackages: number;
  weight: string;
  declaredValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiShipmentsResponse {
  success: boolean;
  message: string;
  data: {
    data: ApiShipmentRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
