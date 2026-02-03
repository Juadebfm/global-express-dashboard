export interface DashboardData {
  app: AppMeta;
  user: DashboardUser;
  ui: DashboardUi;
  kpis: KpiCard[];
  secondaryStats: KpiCard[];
  charts: {
    shipmentTrends: ShipmentTrendsChart;
  };
  activeDeliveries: ActiveDeliveries;
  formatting: FormattingOptions;
}

export interface AppMeta {
  name: string;
  module: string;
  pageTitle: string;
  subtitle: string;
  generatedAt: string;
}

export interface DashboardUser {
  displayName: string;
  email: string;
  avatarUrl: string;
}

export interface DashboardUi {
  topbar: {
    searchPlaceholder: string;
    notifications: {
      unreadCount: number;
    };
  };
  actions: UiAction[];
  sidebar: {
    items: SidebarItem[];
    footer: {
      items: SidebarItem[];
    };
  };
}

export interface UiAction {
  id: string;
  label: string;
  icon: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export interface KpiCard {
  id: string;
  title: string;
  value: number;
  unit: string | null;
  display?: string;
  helperText: string;
  trend: TrendInfo;
  status: 'good' | 'warning' | 'bad';
}

export interface TrendInfo {
  direction: 'up' | 'down';
  percent: number;
  period: string;
}

export interface ShipmentTrendsChart {
  title: string;
  subtitle: string;
  xAxis: {
    type: string;
    key: string;
    label: string;
  };
  yAxis: {
    type: string;
    key: string;
    label: string;
  };
  legend: Array<{
    key: string;
    label: string;
  }>;
  data: Array<{
    month: string;
    deliveries: number;
    shipments: number;
  }>;
}

export interface ActiveDeliveries {
  title: string;
  subtitle: string;
  items: ActiveDelivery[];
}

export interface Location {
  city: string;
  state: string;
  country: string;
}

export interface TimeEstimate {
  display: string;
  minutes: number;
}

export type ActiveDelivery =
  | (ActiveDeliveryBase & {
      status: 'on_time';
      eta: TimeEstimate;
      delay?: never;
      deliveredAt?: never;
    })
  | (ActiveDeliveryBase & {
      status: 'delayed';
      delay: TimeEstimate;
      eta?: never;
      deliveredAt?: never;
    })
  | (ActiveDeliveryBase & {
      status: 'completed';
      deliveredAt: string;
      eta?: never;
      delay?: never;
    });

export interface ActiveDeliveryBase {
  id: string;
  location: Location;
  activeShipments: number;
  statusLabel: string;
  mode: 'truck' | 'ship' | 'air';
}

export interface FormattingOptions {
  currency: {
    code: string;
    locale: string;
  };
  numberCompact: boolean;
  timeZone: string;
}
