export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  SHIPMENTS: '/shipments',
  INVENTORY: '/inventory',
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
