import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { AppShell, ShipmentTimeline } from '@/pages/shared';
import { useDashboardData, useOrderTimeline, useTrackShipment } from '@/hooks';
import { isMasterTrackingNumber } from '@/services/trackingService';
import { ROUTES } from '@/constants';
import { getCustomerTrackingStyle } from '@/lib/statusUtils';
import { cn, resolveLocation } from '@/utils';

function getTrackingStatusStyle(status: string) {
  const style = getCustomerTrackingStyle(status);
  return {
    bg: `${style.bgClass} ${style.textClass}`,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export function TrackShipmentPage(): ReactElement {
  const { t } = useTranslation('tracking');
  const { data, isLoading, error } = useDashboardData();
  const [trackingInput, setTrackingInput] = useState('');
  // Held in a query rather than local state so a batch notification arriving
  // over the WebSocket can refresh what is on screen.
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);
  const {
    data: trackingResult,
    isFetching: isTracking,
    error: trackingError,
  } = useTrackShipment(submittedNumber);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timelineOrderId = trackingResult?.orderId;
  const shouldFetchOrderTimeline = Boolean(timelineOrderId)
    && (!trackingResult?.timeline || trackingResult.timeline.length === 0);
  const { data: orderTimeline, isLoading: timelineLoading } = useOrderTimeline(
    timelineOrderId,
    shouldFetchOrderTimeline,
  );

  // Only ever a backend-issued number. Never echo back what was typed — that
  // would present an unrecognised value as though it were a real tracking
  // number, including an internal order number the backend now rejects.
  const effectiveTrackingNumber =
    trackingResult?.trackingNumber || orderTimeline?.trackingNumber || '';
  const effectiveStatus = trackingResult?.status ?? orderTimeline?.currentStatus;
  const effectiveStatusLabel =
    trackingResult?.statusLabel || orderTimeline?.currentStatusLabel || '';
  const effectiveTimeline =
    trackingResult?.timeline && trackingResult.timeline.length > 0
      ? trackingResult.timeline
      : (orderTimeline?.timeline ?? []);

  const handleTrack = (): void => {
    const normalized = trackingInput.trim();
    if (!normalized) {
      setErrorMessage(t('internal.emptyState'));
      return;
    }

    // Master batch references are staff-only; the public endpoint 404s on them.
    if (isMasterTrackingNumber(normalized)) {
      setSubmittedNumber(null);
      setErrorMessage(t('public.internalNumberDesc'));
      return;
    }

    setErrorMessage(null);
    setSubmittedNumber(normalized);
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel={t('internal.title')}
    >
      <div className="space-y-6">
        {/* Search section */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <Link
            to={ROUTES.SHIPMENTS}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('internal.backToShipments')}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{t('internal.title')}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {t('internal.subtitle')}
          </p>

          <div className="mt-6">
            <label htmlFor="tracking-input" className="text-sm font-semibold text-gray-700">
              {t('internal.inputLabel')}
            </label>
            <div className="mt-2 flex flex-col gap-3 md:flex-row">
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
                placeholder={t('internal.placeholder')}
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
                    {t('internal.tracking')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    {t('internal.trackButton')}
                  </>
                )}
              </button>
            </div>
            {(errorMessage || trackingError) && (
              <p className="mt-3 text-sm text-rose-600">
                {errorMessage ??
                  (trackingError instanceof Error
                    ? trackingError.message
                    : t('internal.emptyState'))}
              </p>
            )}
          </div>
        </section>

        {/* Result section */}
        {trackingResult && (
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">
                {t('internal.shipmentHeading', { trackingNumber: effectiveTrackingNumber })}
              </h2>
              {effectiveStatusLabel && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    {effectiveStatus
                      ? t(`shipments:customerTrackingStatus.${effectiveStatus}`, { defaultValue: effectiveStatusLabel })
                      : effectiveStatusLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.status')}</p>
                {(() => {
                  const s = getTrackingStatusStyle(effectiveStatus ?? 'unknown');
                  return (
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                        s.bg
                      )}
                    >
                      {effectiveStatus
                        ? t(`shipments:customerTrackingStatus.${effectiveStatus}`, { defaultValue: effectiveStatusLabel || s.label })
                        : (effectiveStatusLabel || s.label)}
                    </span>
                  );
                })()}
              </div>

              {/* Estimated Delivery */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.estimatedDelivery')}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {trackingResult.estimatedDelivery ?? t('internal.pending')}
                </p>
              </div>

              {/* Current Location */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.currentLocation')}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {trackingResult.lastLocation || t('internal.unknown')}
                </p>
              </div>

              {/* Last Updated */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.lastUpdated')}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {trackingResult.lastUpdate || t('internal.na')}
                </p>
              </div>
            </div>

            {/* Origin / Destination */}
            {(trackingResult.origin || trackingResult.destination) && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.from')}</p>
                    <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {trackingResult.origin ? (() => { const o = resolveLocation(trackingResult.origin); return t(`shipments:locations.${o}`, { defaultValue: o }); })() : t('internal.na')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                    <ShieldCheck className="h-4 w-4" />
                    {effectiveStatus
                      ? t(`shipments:customerTrackingStatus.${effectiveStatus}`, { defaultValue: effectiveStatusLabel || t('internal.inTransit') })
                      : (effectiveStatusLabel || t('internal.inTransit'))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.to')}</p>
                    <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {trackingResult.destination ? (() => { const d = resolveLocation(trackingResult.destination); return t(`shipments:locations.${d}`, { defaultValue: d }); })() : t('internal.na')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <ShipmentTimeline
                timeline={effectiveTimeline}
                currentStatus={effectiveStatus}
                isLoading={timelineLoading}
              />
            </div>
          </section>
        )}

        {/* Empty state */}
        {!trackingResult && !isTracking && !errorMessage && !trackingError && (
          <section className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-500">
              {t('internal.emptyState')}
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
