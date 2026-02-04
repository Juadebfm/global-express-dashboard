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
