export const PUBLIC_WEBSITE_URL = 'https://www.globalexpress.kr';

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
  NEW_SHIPMENT: '/shipments/new',
  CLIENTS: '/clients',

  ORDERS: '/orders',
  NOTIFICATIONS: '/notifications',
  TEAM: '/team',
  SETTINGS: '/settings',
  SUPPORT: '/support',
  SUPPORT_TICKET: '/support/:ticketId',
  PROFILE: '/profile',
  STAFF_ONBOARDING: '/staff-onboarding',
  ADMIN_DASHBOARD: '/admin/dashboard',
  DELIVERY_SCHEDULE: '/delivery-schedule',
  PAYMENTS: '/payments',
  PAYMENT_CALLBACK: '/payments/callback',
  BULK_ORDERS: '/bulk-orders',
  REPORTS: '/reports',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
