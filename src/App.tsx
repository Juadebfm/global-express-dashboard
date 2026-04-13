import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/store';
import { ProtectedRoute } from '@/components/auth';
import { FeedbackCenter, PageLoader } from '@/components/ui';
import {
  LandingPage,
  LoginPage,
  ExternalSignInPage,
  CompleteProfilePage,
  ExternalSignUpPage,
  StaffOnboardingPage,
  ForgotPasswordPage,
  ForbiddenPage,
  NotFoundPage,
  TrackPage,
  DashboardPage,
  AdminDashboardPage,
  ShipmentsPage,
  TrackShipmentPage,
  NewShipmentPage,
  ClientsPage,
  OrdersPage,
  NotificationsPage,
  TeamPage,
  SettingsPage,
  SupportPage,
  DeliverySchedulePage,
  PaymentsPage,
  PaymentCallbackPage,
  BulkOrdersPage,
  ReportsPage,
} from '@/pages';
import { ROUTES, isLaunchGateActive } from '@/constants';

function RouteChangeOverlay(): ReactElement | null {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return isVisible ? <PageLoader label="Loading page..." /> : null;
}

function AppRoutes(): ReactElement {
  const location = useLocation();
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
      <>
        <RouteChangeOverlay key={location.key} />
        <Routes>
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <RouteChangeOverlay key={location.key} />
      <Routes>
        {/* Public routes */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGN_IN} element={<ExternalSignInPage />} />
        <Route path={ROUTES.SIGN_UP} element={<ExternalSignUpPage />} />
        <Route path="/signup" element={<ExternalSignUpPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.FORBIDDEN} element={<ForbiddenPage />} />
        <Route path={ROUTES.TRACK_PUBLIC} element={<TrackPage />} />
        <Route path={`${ROUTES.TRACK_PUBLIC}/:trackingNumber`} element={<TrackPage />} />

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
          path={ROUTES.BULK_ORDERS}
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
              <BulkOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.REPORTS}
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackCenter />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
