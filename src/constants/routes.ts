export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  FORGOT_PASSWORD: '/forgot-password',
  COMPLETE_PROFILE: '/complete-profile',
  FORBIDDEN: '/forbidden',
  TRACK_PUBLIC: '/track',
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
