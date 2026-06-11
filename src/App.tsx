import type { ReactElement } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/store';
import { ProtectedRoute } from '@/components/auth';
import { RouteErrorBoundary } from '@/components/errors';
import { FeedbackCenter, PageLoader } from '@/components/ui';
// Static imports — auth + landing + error pages + public tracking. These are
// either needed on the initial paint (landing, login) or so small they aren't
// worth splitting (error fallbacks). Everything else is lazy below.
import {
  LandingPage,
  LoginPage,
  ExternalSignInPage,
  CompleteProfilePage,
  ExternalSignUpPage,
  StaffOnboardingPage,
  ForgotPasswordPage,
  MfaChallengePage,
  MfaEnrollmentPage,
  ForbiddenPage,
  NotFoundPage,
  TrackPage,
} from '@/pages';
import { ROUTES, isLaunchGateActive } from '@/constants';

// Code-split everything that lives behind auth or behind a less-trafficked
// public surface. The named-export `.then(m => ({ default: m.X }))` form
// matches our barrel re-export pattern. The whole authed surface area shares
// one Suspense boundary on the <Routes> tree below.
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const ShipmentsPage = lazy(() =>
  import('@/pages/shipments/ShipmentsPage').then((m) => ({ default: m.ShipmentsPage })),
);
const TrackShipmentPage = lazy(() =>
  import('@/pages/shipments/TrackShipmentPage').then((m) => ({ default: m.TrackShipmentPage })),
);
const NewShipmentPage = lazy(() =>
  import('@/pages/shipments/NewShipmentPage').then((m) => ({ default: m.NewShipmentPage })),
);
const ShipmentDetailPage = lazy(() =>
  import('@/pages/shipments/ShipmentDetailPage').then((m) => ({ default: m.ShipmentDetailPage })),
);
const ClientsPage = lazy(() =>
  import('@/pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const ClientWorkbenchPage = lazy(() =>
  import('@/pages/clients/ClientWorkbenchPage').then((m) => ({ default: m.ClientWorkbenchPage })),
);
const SuppliersPage = lazy(() =>
  import('@/pages/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const OrdersPage = lazy(() =>
  import('@/pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const TeamPage = lazy(() =>
  import('@/pages/team/TeamPage').then((m) => ({ default: m.TeamPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const SupportPage = lazy(() =>
  import('@/pages/support/SupportPage').then((m) => ({ default: m.SupportPage })),
);
const DeliverySchedulePage = lazy(() =>
  import('@/pages/deliverySchedule/DeliverySchedulePage').then((m) => ({ default: m.DeliverySchedulePage })),
);
const PaymentsPage = lazy(() =>
  import('@/pages/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const PaymentCallbackPage = lazy(() =>
  import('@/pages/payments/PaymentCallbackPage').then((m) => ({ default: m.PaymentCallbackPage })),
);
// ReportsPage owns the recharts import — keeping it lazy is the single
// biggest bundle-size win available.
const ReportsPage = lazy(() =>
  import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

// Phase 4 marketing + Phase 5 admin surfaces (already lazy).
const GalleryPage = lazy(() =>
  import('@/pages/public/GalleryPage').then((m) => ({ default: m.GalleryPage })),
);
const D2dIntakePage = lazy(() =>
  import('@/pages/public/D2dIntakePage').then((m) => ({ default: m.D2dIntakePage })),
);
const AdminGalleryPage = lazy(() =>
  import('@/pages/admin/AdminGalleryPage').then((m) => ({ default: m.AdminGalleryPage })),
);
const AdminImportsPage = lazy(() =>
  import('@/pages/admin/AdminImportsPage').then((m) => ({ default: m.AdminImportsPage })),
);

function AppRoutes(): ReactElement {
  const [launchGateActive, setLaunchGateActive] = useState<boolean>(() => isLaunchGateActive());

  useEffect(() => {
    if (!launchGateActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLaunchGateActive(isLaunchGateActive());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [launchGateActive]);

  if (launchGateActive) {
    return (
      <Routes>
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGN_IN} element={<ExternalSignInPage />} />
      <Route path={ROUTES.SIGN_UP} element={<ExternalSignUpPage />} />
      <Route path="/signup" element={<ExternalSignUpPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.MFA_CHALLENGE} element={<MfaChallengePage />} />
      <Route
        path={ROUTES.MFA_ENROLL}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <MfaEnrollmentPage />
          </ProtectedRoute>
        }
      />
      <Route path={ROUTES.FORBIDDEN} element={<ForbiddenPage />} />
      <Route path={ROUTES.TRACK_PUBLIC} element={<TrackPage />} />
      <Route path={`${ROUTES.TRACK_PUBLIC}/:trackingNumber`} element={<TrackPage />} />
      <Route path={ROUTES.GALLERY_PUBLIC} element={<GalleryPage />} />
      <Route path={ROUTES.D2D_INTAKE_PUBLIC} element={<D2dIntakePage />} />

      {/* Clerk user profile completion (handled inside page, no ProtectedRoute wrapper needed) */}
      <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfilePage />} />

      {/* Staff onboarding (password change + profile completion) */}
      <Route path={ROUTES.STAFF_ONBOARDING} element={<StaffOnboardingPage />} />

      {/* Protected routes */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute
            allowedRoles={['user']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_DASHBOARD}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            redirectTo={ROUTES.DASHBOARD}
          >
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SHIPMENTS}
        element={
          <ProtectedRoute>
            <ShipmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SHIPMENT_TRACK}
        element={
          <ProtectedRoute>
            <TrackShipmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.NEW_SHIPMENT}
        element={
          <ProtectedRoute>
            <NewShipmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SHIPMENT_DETAIL}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            redirectTo={ROUTES.SHIPMENTS}
          >
            <ShipmentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CLIENTS}
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'superadmin']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CLIENT_WORKBENCH}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <ClientWorkbenchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIERS}
        element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ORDERS}
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.NOTIFICATIONS}
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.TEAM}
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SUPPORT}
        element={
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SUPPORT_TICKET}
        element={
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.DELIVERY_SCHEDULE}
        element={
          <ProtectedRoute
            allowedRoles={['user']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <DeliverySchedulePage />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.PAYMENTS}
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PAYMENT_CALLBACK}
        element={<PaymentCallbackPage />}
      />
      <Route
        path={ROUTES.REPORTS}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_GALLERY}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <AdminGalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_IMPORTS}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminImportsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}

function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackCenter />
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
