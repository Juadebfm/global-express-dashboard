import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Check,
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
import type { TrackingResult, TimelineEvent } from '@/services/trackingService';
import { ROUTES } from '@/constants';
import { getStatusStyle, getStatusCategory } from '@/lib/statusUtils';
import { cn, resolveLocation } from '@/utils';

function getTrackingStatusStyle(status: string) {
  const style = getStatusStyle(status);
  return {
    bg: `${style.bgClass} ${style.textClass}`,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export function TrackShipmentPage(): ReactElement {
  const { t } = useTranslation('tracking');
  const { data, isLoading, error } = useDashboardData();
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTrack = async (): Promise<void> => {
    const normalized = trackingInput.trim();
    if (!normalized) {
      setErrorMessage(t('internal.emptyState'));
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
          : t('internal.emptyState')
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
                {t('internal.shipmentHeading', { trackingNumber: trackingResult.trackingNumber })}
              </h2>
              {trackingResult.statusLabel && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    {trackingResult.status ? t(`shipments:statusV2.${trackingResult.status}`, { defaultValue: trackingResult.statusLabel }) : trackingResult.statusLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">{t('internal.status')}</p>
                {(() => {
                  const s = getTrackingStatusStyle(trackingResult.status ?? 'unknown');
                  return (
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                        s.bg
                      )}
                    >
                      {trackingResult.status ? t(`shipments:statusV2.${trackingResult.status}`, { defaultValue: trackingResult.statusLabel || s.label }) : (trackingResult.statusLabel || s.label)}
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
                    {trackingResult.status ? t(`shipments:statusV2.${trackingResult.status}`, { defaultValue: trackingResult.statusLabel || t('internal.inTransit') }) : (trackingResult.statusLabel || t('internal.inTransit'))}
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
              <h3 className="text-sm font-semibold text-gray-900">{t('internal.timeline')}</h3>
              {trackingResult.timeline && trackingResult.timeline.length > 0 ? (
                <ol className="mt-4 space-y-0">
                  {trackingResult.timeline.map((event: TimelineEvent, idx: number) => {
                    const isLast = idx === trackingResult.timeline!.length - 1;
                    const isCurrent = event.status === trackingResult.status;
                    const category = getStatusCategory(event.status);
                    const dotColor: Record<string, string> = {
                      pending: 'bg-amber-500',
                      active: 'bg-blue-500',
                      completed: 'bg-emerald-500',
                      exception: 'bg-rose-500',
                    };
                    const ringColor: Record<string, string> = {
                      pending: 'ring-amber-200',
                      active: 'ring-blue-200',
                      completed: 'ring-emerald-200',
                      exception: 'ring-rose-200',
                    };

                    const formattedTime = (() => {
                      const d = new Date(event.timestamp);
                      if (Number.isNaN(d.getTime())) return event.timestamp;
                      return d.toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    })();

                    return (
                      <li key={event.status} className="relative flex gap-4">
                        {/* Vertical line + dot */}
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                              isCurrent
                                ? `${dotColor[category]} ring-4 ${ringColor[category]}`
                                : dotColor[category]
                            )}
                          >
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                          {!isLast && (
                            <div className="w-0.5 grow bg-gray-200" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={cn('pb-6', isLast && 'pb-0')}>
                          <p
                            className={cn(
                              'text-sm font-semibold leading-7',
                              isCurrent ? 'text-gray-900' : 'text-gray-700'
                            )}
                          >
                            {t(`shipments:statusV2.${event.status}`, { defaultValue: event.statusLabel })}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {formattedTime}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-gray-400">{t('internal.timelineEmpty')}</p>
              )}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!trackingResult && !isTracking && !errorMessage && (
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
