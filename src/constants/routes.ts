export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  SHIPMENTS: '/shipments',
  SHIPMENT_TRACK: '/shipments/track',
  SHIPMENT_NEW: '/shipments/new',
  SHIPMENT_INVOICE: '/shipments/invoice',
  CLIENTS: '/clients',
  USERS: '/users',
  ORDERS: '/orders',
  NOTIFICATIONS: '/notifications',
  TEAM: '/team',
  SETTINGS: '/settings',
  SUPPORT: '/support',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
