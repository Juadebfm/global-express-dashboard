import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enShipments from './locales/en/shipments.json';
import enOrders from './locales/en/orders.json';
import enBulkOrders from './locales/en/bulkOrders.json';
import enReports from './locales/en/reports.json';
import enSettings from './locales/en/settings.json';
import enSupport from './locales/en/support.json';
import enPayments from './locales/en/payments.json';
import enNotifications from './locales/en/notifications.json';
import enTeam from './locales/en/team.json';
import enTracking from './locales/en/tracking.json';
import enClients from './locales/en/clients.json';
import enDeliverySchedule from './locales/en/deliverySchedule.json';
import enOnboarding from './locales/en/onboarding.json';
import enProfile from './locales/en/profile.json';

import koCommon from './locales/ko/common.json';
import koNav from './locales/ko/nav.json';
import koAuth from './locales/ko/auth.json';
import koDashboard from './locales/ko/dashboard.json';
import koShipments from './locales/ko/shipments.json';
import koOrders from './locales/ko/orders.json';
import koBulkOrders from './locales/ko/bulkOrders.json';
import koReports from './locales/ko/reports.json';
import koSettings from './locales/ko/settings.json';
import koSupport from './locales/ko/support.json';
import koPayments from './locales/ko/payments.json';
import koNotifications from './locales/ko/notifications.json';
import koTeam from './locales/ko/team.json';
import koTracking from './locales/ko/tracking.json';
import koClients from './locales/ko/clients.json';
import koDeliverySchedule from './locales/ko/deliverySchedule.json';
import koOnboarding from './locales/ko/onboarding.json';
import koProfile from './locales/ko/profile.json';

export const LANGUAGE_STORAGE_KEY = 'globalxpress_language';

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        auth: enAuth,
        dashboard: enDashboard,
        shipments: enShipments,
        orders: enOrders,
        bulkOrders: enBulkOrders,
        reports: enReports,
        settings: enSettings,
        support: enSupport,
        payments: enPayments,
        notifications: enNotifications,
        team: enTeam,
        tracking: enTracking,
        clients: enClients,
        deliverySchedule: enDeliverySchedule,
        onboarding: enOnboarding,
        profile: enProfile,
      },
      ko: {
        common: koCommon,
        nav: koNav,
        auth: koAuth,
        dashboard: koDashboard,
        shipments: koShipments,
        orders: koOrders,
        bulkOrders: koBulkOrders,
        reports: koReports,
        settings: koSettings,
        support: koSupport,
        payments: koPayments,
        notifications: koNotifications,
        team: koTeam,
        tracking: koTracking,
        clients: koClients,
        deliverySchedule: koDeliverySchedule,
        onboarding: koOnboarding,
        profile: koProfile,
      },
    },
    lng: localStorage.getItem(LANGUAGE_STORAGE_KEY) || undefined,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ko'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

export default i18n;
