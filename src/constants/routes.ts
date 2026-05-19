export const PUBLIC_WEBSITE_URL = 'https://www.globalexpress.kr';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  FORGOT_PASSWORD: '/forgot-password',
  MFA_CHALLENGE: '/login/mfa',
  MFA_ENROLL: '/mfa/enroll',
  COMPLETE_PROFILE: '/complete-profile',
  FORBIDDEN: '/forbidden',
  TRACK_PUBLIC: '/track',
  GALLERY_PUBLIC: '/gallery',
  D2D_INTAKE_PUBLIC: '/d2d/intake',
  ADMIN_GALLERY: '/admin/gallery',
  ADMIN_IMPORTS: '/admin/imports',
  DASHBOARD: '/dashboard',
  SHIPMENTS: '/shipments',
  SHIPMENT_TRACK: '/shipments/track',
  NEW_SHIPMENT: '/shipments/new',
  SHIPMENT_DETAIL: '/shipments/:id',
  CLIENTS: '/clients',
  CLIENT_WORKBENCH: '/clients/:id',
  SUPPLIERS: '/suppliers',

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
