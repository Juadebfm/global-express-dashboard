import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Package,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/pages/shared';
import { useDashboardData } from '@/hooks';
import { trackShipment } from '@/services';
import type { TrackingResult } from '@/services/trackingService';
import { ROUTES } from '@/constants';
import { getStatusStyle } from '@/lib/statusUtils';
import { cn } from '@/utils';

function getTrackingStatusStyle(status: string) {
  const style = getStatusStyle(status);
  return {
    bg: `${style.bgClass} ${style.textClass}`,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export function TrackShipmentPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTrack = async (): Promise<void> => {
    const normalized = trackingInput.trim();
    if (!normalized) {
      setErrorMessage('Enter a tracking number to continue.');
      return;
    }

    setErrorMessage(null);
    setIsTracking(true);
    setTrackingResult(null);

    try {
      const result = await trackShipment(normalized);
      setTrackingResult(result);
    } catch (trackError) {
      setErrorMessage(
        trackError instanceof Error
          ? trackError.message
          : 'Tracking number not found. Please check and try again.'
      );
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading tracking..."
    >
      <div className="space-y-6">
        {/* Search section */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <Link
            to={ROUTES.SHIPMENTS}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to shipments
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Track your shipment</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter a tracking number to get real-time updates on your shipment.
          </p>

          <div className="mt-6">
            <label htmlFor="tracking-input" className="text-sm font-semibold text-gray-700">
              Enter your Tracking Number
            </label>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row">
              <input
                id="tracking-input"
                type="text"
                value={trackingInput}
                onChange={(event) => setTrackingInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleTrack();
                  }
                }}
                placeholder="e.g. GX-ABC123"
                className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => void handleTrack()}
                disabled={isTracking}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white',
                  isTracking
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-brand-500 hover:bg-brand-600'
                )}
              >
                {isTracking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Track Shipment
                  </>
                )}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
            )}
          </div>
        </section>

        {/* Result section */}
        {trackingResult && (
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">
                Shipment {trackingResult.trackingNumber}
              </h2>
              {trackingResult.statusLabel && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    {trackingResult.statusLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
                {(() => {
                  const s = getTrackingStatusStyle(trackingResult.status ?? 'unknown');
                  return (
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                        s.bg
                      )}
                    >
                      {trackingResult.statusLabel || s.label}
                    </span>
                  );
                })()}
              </div>

              {/* Estimated Delivery */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Estimated Delivery</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {trackingResult.estimatedDelivery ?? 'Pending'}
                </p>
              </div>

              {/* Current Location */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Current Location</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {trackingResult.lastLocation || 'Unknown'}
                </p>
              </div>

              {/* Last Updated */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Last Updated</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {trackingResult.lastUpdate || 'N/A'}
                </p>
              </div>
            </div>

            {/* Origin / Destination */}
            {(trackingResult.origin || trackingResult.destination) && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">From</p>
                    <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {trackingResult.origin ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                    <ShieldCheck className="h-4 w-4" />
                    {trackingResult.statusLabel || 'In Transit'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">To</p>
                    <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {trackingResult.destination ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!trackingResult && !isTracking && !errorMessage && (
          <section className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-500">
              Enter a tracking number above to view shipment details.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
