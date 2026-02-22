import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, ThemeProvider } from '@/store';
import { ProtectedRoute } from '@/components/auth';
import { PageLoader } from '@/components/ui';
import {
  LandingPage,
  LoginPage,
  ExternalSignInPage,
  CompleteProfilePage,
  ExternalSignUpPage,
  ForgotPasswordPage,
  ForbiddenPage,
  TrackPage,
  DashboardPage,
  ShipmentsPage,
  TrackShipmentPage,
  NewShipmentPage,
  InvoiceDraftPage,
  ClientsPage,
  UsersPage,
  OrdersPage,
  NotificationsPage,
  TeamPage,
  SettingsPage,
  SupportPage,
} from '@/pages';
import { ROUTES } from '@/constants';

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

        {/* Protected routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
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
          path={ROUTES.SHIPMENT_NEW}
          element={
            <ProtectedRoute>
              <NewShipmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SHIPMENT_INVOICE}
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
              <InvoiceDraftPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CLIENTS}
          element={
            <ProtectedRoute>
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
          path={ROUTES.USERS}
          element={
            <ProtectedRoute>
              <UsersPage />
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </>
  );
}

function App(): ReactElement {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
