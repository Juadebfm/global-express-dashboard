import type { ReactElement } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useSearchParams } from 'react-router-dom';
import { AuthProvider } from '@/store';
import { useCan, usePermissionsSync } from '@/hooks';
import { ProtectedRoute } from '@/components/auth';
import { SupplierRoute } from '@/components/supplier/SupplierRoute';
import { RouteErrorBoundary } from '@/components/errors';
import { FeedbackCenter, PageLoader } from '@/components/ui';
// Landing must stay on the initial path because it is also the launch-gate
// surface. The other auth flows are route-level chunks: importing signup and
// profile completion eagerly pulled phone metadata, flags and form libraries
// into every public visit.
import { LandingPage } from '@/pages/auth/LandingPage';
import { ForbiddenPage, NotFoundPage } from '@/pages/errors';
import { TrackPage } from '@/pages/public';
import { ROUTES, isLaunchGateActive } from '@/constants';

// Code-split everything that lives behind auth or behind a less-trafficked
// public surface. The named-export `.then(m => ({ default: m.X }))` form
// matches our barrel re-export pattern. The whole authed surface area shares
// one Suspense boundary on the <Routes> tree below.
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ExternalSignInPage = lazy(() =>
  import('@/pages/auth/ExternalSignInPage').then((m) => ({ default: m.ExternalSignInPage })),
);
const CompleteProfilePage = lazy(() =>
  import('@/pages/auth/CompleteProfilePage').then((m) => ({ default: m.CompleteProfilePage })),
);
const ExternalSignUpPage = lazy(() =>
  import('@/pages/auth/ExternalSignUpPage').then((m) => ({ default: m.ExternalSignUpPage })),
);
const StaffOnboardingPage = lazy(() =>
  import('@/pages/auth/StaffOnboardingPage').then((m) => ({ default: m.StaffOnboardingPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ReactivateAccountPage = lazy(() =>
  import('@/pages/auth/ReactivateAccountPage').then((m) => ({ default: m.ReactivateAccountPage })),
);
const MfaChallengePage = lazy(() =>
  import('@/pages/auth/MfaChallengePage').then((m) => ({ default: m.MfaChallengePage })),
);
const MfaEnrollmentPage = lazy(() =>
  import('@/pages/auth/MfaEnrollmentPage').then((m) => ({ default: m.MfaEnrollmentPage })),
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
const ClientsPage = lazy(() =>
  import('@/pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const ClientWorkbenchPage = lazy(() =>
  import('@/pages/clients/ClientWorkbenchPage').then((m) => ({ default: m.ClientWorkbenchPage })),
);
const SuppliersPage = lazy(() =>
  import('@/pages/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
// /orders: staff+ get redirected to /operations; customers render the
// customer-facing OrdersPage directly (see OrdersRoleRouter below).
const OrdersPage = lazy(() =>
  import('@/pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const TeamPage = lazy(() =>
  import('@/pages/team/TeamPage').then((m) => ({ default: m.TeamPage })),
);
const PermissionsPage = lazy(() =>
  import('@/pages/admin/PermissionsPage').then((m) => ({ default: m.PermissionsPage })),
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
const NewBookingPage = lazy(() =>
  import('@/pages/bookings/NewBookingPage/NewBookingPage').then((m) => ({ default: m.NewBookingPage })),
);
const OperationsPage = lazy(() =>
  import('@/pages/operations/OperationsPage/OperationsPage').then((m) => ({ default: m.OperationsPage })),
);
const BatchesPage = lazy(() =>
  import('@/pages/batches/BatchesPage').then((m) => ({ default: m.BatchesPage })),
);
const BatchDetailPage = lazy(() =>
  import('@/pages/batches/BatchDetailPage').then((m) => ({ default: m.BatchDetailPage })),
);
// Deep-link only (from an admin_alert notification's View button) — no
// sidebar entry, see ROUTES.SHOP_INTEREST_DETAIL.
const ShopInterestDetailPage = lazy(() =>
  import('@/pages/shop/ShopInterestDetailPage/ShopInterestDetailPage').then((m) => ({ default: m.ShopInterestDetailPage })),
);
const SupplierNoticesPage = lazy(() =>
  import('@/pages/supplierNotices/SupplierNoticesPage/SupplierNoticesPage').then((m) => ({ default: m.SupplierNoticesPage })),
);
const SupplierNoticeReviewPage = lazy(() =>
  import('@/pages/supplierNotices/SupplierNoticeReviewPage/SupplierNoticeReviewPage').then((m) => ({ default: m.SupplierNoticeReviewPage })),
);
const SupplierLoginPage = lazy(() =>
  import('@/pages/supplier/SupplierLoginPage/SupplierLoginPage').then((m) => ({ default: m.SupplierLoginPage })),
);
const SupplierDashboardPage = lazy(() =>
  import('@/pages/supplier/SupplierDashboardPage/SupplierDashboardPage').then((m) => ({ default: m.SupplierDashboardPage })),
);
const SupplierNewDeclarationPage = lazy(() =>
  import('@/pages/supplier/SupplierNewDeclarationPage/SupplierNewDeclarationPage').then((m) => ({ default: m.SupplierNewDeclarationPage })),
);
const SupplierDeclarationDetailPage = lazy(() =>
  import('@/pages/supplier/SupplierDeclarationDetailPage/SupplierDeclarationDetailPage').then((m) => ({ default: m.SupplierDeclarationDetailPage })),
);
const SupplierRequestsPage = lazy(() =>
  import('@/pages/supplier/SupplierRequestsPage/SupplierRequestsPage').then((m) => ({ default: m.SupplierRequestsPage })),
);
const SupplierDirectoryProfilePage = lazy(() =>
  import('@/pages/supplier/SupplierDirectoryProfilePage').then((m) => ({ default: m.SupplierDirectoryProfilePage })),
);
const SupplierAccountPage = lazy(() =>
  import('@/pages/supplier/SupplierAccountPage').then((m) => ({ default: m.SupplierAccountPage })),
);
const AdminSupplierDirectoryProfilePage = lazy(() =>
  import('@/pages/admin/AdminSupplierDirectoryProfilePage').then((m) => ({ default: m.AdminSupplierDirectoryProfilePage })),
);
const LeadsPage = lazy(() =>
  import('@/pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })),
);
const NewsletterSubscribersPage = lazy(() =>
  import('@/pages/newsletter/NewsletterSubscribersPage').then((m) => ({ default: m.NewsletterSubscribersPage })),
);
const D2DMyRequestsPage = lazy(() =>
  import('@/pages/d2d/D2DMyRequestsPage').then((m) => ({ default: m.D2DMyRequestsPage })),
);

// Staff+ visiting /orders get bounced to /operations (preserving the query
// string — ?select=<id>, &tab=warehouse, etc. — a bare <Navigate> would drop
// it, breaking deep links like notifications/batch-detail into an order).
// Customers get the real customer-facing OrdersPage rendered directly —
// this is their only in-app path to view shipment detail and pay
// (ShipmentListSection's "My Shipments" row click still links here).
function OrdersRoleRouter(): ReactElement {
  const [searchParams] = useSearchParams();
  const isOperator = useCan('app.operator');
  if (isOperator) {
    return <Navigate to={{ pathname: ROUTES.OPERATIONS, search: searchParams.toString() }} replace />;
  }
  return <OrdersPage />;
}

function AppRoutes(): ReactElement {
  const [launchGateActive, setLaunchGateActive] = useState<boolean>(() => isLaunchGateActive());
  // App-wide reaction to a backend capability denial. Mounted here (inside
  // AuthProvider, above every route) so it survives navigation and there is
  // exactly one listener.
  usePermissionsSync();

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
      <Route path={ROUTES.REACTIVATE_ACCOUNT} element={<ReactivateAccountPage />} />
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
      <Route
        path={ROUTES.STAFF_ONBOARDING}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']} redirectTo={ROUTES.LOGIN}>
            <StaffOnboardingPage />
          </ProtectedRoute>
        }
      />

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
        path={ROUTES.BOOKINGS_NEW}
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <NewBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OPERATIONS}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <OperationsPage />
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
            allowedRoles={['staff', 'admin', 'superadmin']}
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
          <ProtectedRoute allowedRoles={['user']} redirectTo={ROUTES.ADMIN_DASHBOARD}>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ORDERS}
        element={
          <ProtectedRoute>
            <OrdersRoleRouter />
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
          <ProtectedRoute allowedRoles={['superadmin']} redirectTo={ROUTES.DASHBOARD}>
            <TeamPage />
          </ProtectedRoute>
        }
      />
      {/* Capability administration. Superadmin-only at the route AND inside
          the page, mirroring requireSuperAdmin on /permissions/catalogue,
          /permissions/users/:id and the grant toggle. */}
      <Route
        path={ROUTES.PERMISSIONS}
        element={
          <ProtectedRoute allowedRoles={['superadmin']} redirectTo={ROUTES.DASHBOARD}>
            <PermissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']} redirectTo={ROUTES.DASHBOARD}>
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
          <ProtectedRoute
            allowedRoles={['user', 'staff', 'admin', 'superadmin']}
            requiredCapabilities={['finance.reports.view']}
            skipCapabilityRoles={['user']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
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
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            requiredCapabilities={[
              'finance.reports.view',
              'reports.operational.view',
              'audit_logs.view',
            ]}
            capabilityMode="any"
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.AUDIT_LOGS}
        element={<Navigate to="/reports?tab=audit" replace />}
      />
      <Route
        path={ROUTES.ADMIN_GALLERY}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            requiredCapabilities={['catalogue.manage']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <AdminGalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_IMPORTS}
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminImportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.BATCHES}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <BatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.BATCH_DETAIL}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <BatchDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SHOP_INTEREST_DETAIL}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            requiredCapabilities={['catalogue.manage']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <ShopInterestDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Supplier notices (staff-side) */}
      <Route
        path={ROUTES.SUPPLIER_NOTICES}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <SupplierNoticesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_NOTICE_REVIEW}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']}>
            <SupplierNoticeReviewPage />
          </ProtectedRoute>
        }
      />

      {/* Leads — staff+ see all leads; customers see their own D2D requests */}
      <Route
        path={ROUTES.LEADS}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']} redirectTo={ROUTES.ADMIN_DASHBOARD}>
            <LeadsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.NEWSLETTER_SUBSCRIBERS}
        element={
          <ProtectedRoute
            allowedRoles={['staff', 'admin', 'superadmin']}
            requiredCapabilities={['newsletter.manage']}
            redirectTo={ROUTES.ADMIN_DASHBOARD}
          >
            <NewsletterSubscribersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.D2D_MY_REQUESTS}
        element={
          <ProtectedRoute allowedRoles={['user']} redirectTo={ROUTES.DASHBOARD}>
            <D2DMyRequestsPage />
          </ProtectedRoute>
        }
      />

      {/* Supplier portal */}
      <Route path={ROUTES.SUPPLIER_LOGIN} element={<SupplierLoginPage />} />
      <Route
        path={ROUTES.SUPPLIER_DASHBOARD}
        element={
          <SupplierRoute>
            <SupplierDashboardPage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_NEW_GOODS_NOTICE}
        element={
          <SupplierRoute>
            <SupplierNewDeclarationPage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_GOODS_NOTICE_DETAIL}
        element={
          <SupplierRoute>
            <SupplierDeclarationDetailPage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_REQUESTS}
        element={
          <SupplierRoute>
            <SupplierRequestsPage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_DIRECTORY_PROFILE}
        element={
          <SupplierRoute>
            <SupplierDirectoryProfilePage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.SUPPLIER_ACCOUNT}
        element={
          <SupplierRoute>
            <SupplierAccountPage />
          </SupplierRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_SUPPLIER_DIRECTORY_PROFILE}
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin', 'superadmin']} redirectTo={ROUTES.ADMIN_DASHBOARD}>
            <AdminSupplierDirectoryProfilePage />
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
