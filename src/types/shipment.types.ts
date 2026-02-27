import type { StatusCategory } from './status.types';

export type ShipmentMode = 'air' | 'ocean';


export interface ShipmentStatusSummary {
  id: string;
  label: string;
  value: number;
  status: StatusCategory;
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
  value: StatusCategory | 'all';
}

export interface ShipmentRecord {
  id: string;
  sku: string;
  customer: string;
  origin: string;
  destination: string;
  departureDate: string;
  etaDate: string;
  status: StatusCategory;
  statusV2: string;
  statusLabel: string;
  mode: ShipmentMode;
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

export interface ApiShipmentRecord {
  id: string;
  trackingNumber: string;
  senderName: string;
  origin: string;
  destination: string;
  departureDate: string;
  eta: string;
  statusV2: string;
  statusLabel: string;
  shipmentType: 'air' | 'ocean';
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
