// ── Change Indicators ─────────────────────────────────────────────────────────
// null = no prior-period data → hide badge entirely
export type ChangeIndicator = { value: number; direction: 'up' | 'down' } | null;

// ── UI / Internal Types ───────────────────────────────────────────────────────

export interface DashboardData {
  app: AppMeta;
  user: DashboardUser;
  ui: DashboardUi;
  kpis: KpiCard[];
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
  change: ChangeIndicator;
  status: 'good' | 'warning' | 'bad';
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

export interface ActiveDeliveryBase {
  id: string;
  location: Location;
  activeShipments: number;
  statusLabel: string;
  mode: 'truck' | 'ship' | 'air';
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
    })
  | (ActiveDeliveryBase & {
      status: 'unknown';
      eta?: never;
      delay?: never;
      deliveredAt?: never;
    });

export interface FormattingOptions {
  currency: {
    code: string;
    locale: string;
  };
  numberCompact: boolean;
  timeZone: string;
}

// ── Raw API Response Types ────────────────────────────────────────────────────

export interface ApiDashboardStats {
  totalOrders: number;
  totalOrdersChange: ChangeIndicator;
  activeShipments: number;
  activeShipmentsChange: ChangeIndicator;
  pendingOrders: number;
  pendingOrdersChange: ChangeIndicator;
  deliveredToday: number;
  deliveredTotal: number;
  deliveredTotalChange: ChangeIndicator;
  cancelled: number;
  returned: number;
  // Role-dependent financial fields
  revenueMtd?: string;
  revenueMtdChange?: ChangeIndicator;
  totalSpent?: string;
  totalSpentChange?: ChangeIndicator;
}

export interface ApiTrend {
  month: number; // 1–12
  deliveredWeight: string; // parse with parseFloat()
  activeWeight: string; // parse with parseFloat()
}

export interface ApiActiveDelivery {
  destination: string; // e.g. "Lagos, Nigeria"
  shipmentType: 'air' | 'ocean' | 'road' | null;
  activeCount: number;
  nextEta: string | null; // ISO 8601
  status: 'on_time' | 'delayed' | 'unknown';
}

export interface ApiDashboardResponse {
  success: boolean;
  data: {
    stats: ApiDashboardStats;
    trends: ApiTrend[];
    activeDeliveries: ApiActiveDelivery[];
  };
}
