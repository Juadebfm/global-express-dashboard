import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle, PackagePlus } from 'lucide-react';
import { useAuth } from '@/hooks';
import { useOrders } from '@/hooks';
import { Button, Card, AlertBanner, Pagination } from '@/components/ui';
import { AppLayout } from '@/components/layout';
import { ROUTES } from '@/constants';
import { ShipmentRow } from './components/ShipmentRow';

const SKELETON_COUNT = 5;

export function DashboardPage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { orders, pagination, isLoading, error } = useOrders(page);

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : '',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">My Shipments</h1>
          <Button size="sm" onClick={() => navigate(ROUTES.BOOKINGS_NEW)} data-tour="booking-btn">
            <PackagePlus className="h-4 w-4 mr-1.5" />
            New Booking
          </Button>
        </div>

        {/* Incomplete profile banner */}
        {user?.mustCompleteProfile && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <UserCircle className="h-5 w-5 shrink-0" />
              <span>Your profile is incomplete. Add your details to unlock all features.</span>
            </div>
            <Link
              to={ROUTES.PROFILE}
              className="shrink-0 text-sm font-semibold text-amber-800 underline-offset-2 hover:underline"
            >
              Complete profile
            </Link>
          </div>
        )}

        {/* Shipment list */}
        {error ? (
          <AlertBanner tone="error" message="Failed to load your shipments. Please refresh." />
        ) : (
          <Card className="p-0 divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="h-4 w-4 rounded bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/3 rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200 shrink-0" />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-4 p-12 text-center">
                <PackagePlus className="h-10 w-10 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-700">No shipments yet</p>
                  <p className="mt-1 text-sm text-gray-400">Place a booking to get started.</p>
                </div>
                <Button size="sm" onClick={() => navigate(ROUTES.BOOKINGS_NEW)}>
                  New Booking
                </Button>
              </div>
            ) : (
              orders.map((row) => <ShipmentRow key={row.id} row={row} />)
            )}
          </Card>
        )}

        {/* Pagination */}
        {!isLoading && !error && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </AppLayout>
  );
}
