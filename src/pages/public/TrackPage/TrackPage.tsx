import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Package, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { ROUTES } from '@/constants';
import { trackShipment, type TrackingResult } from '@/services/trackingService';

type StatusKey = 'in_transit' | 'delivered' | 'pending';

const statusStyles: Record<StatusKey, { bg: string; text: string; dot: string }> = {
  in_transit: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
};

function resolveStatusKey(result: TrackingResult): StatusKey {
  if (result.status) return result.status;
  const label = result.statusLabel.toLowerCase();
  if (label.includes('delivered')) return 'delivered';
  if (label.includes('transit') || label.includes('progress')) return 'in_transit';
  return 'pending';
}

export function TrackPage(): ReactElement {
  const { trackingNumber: paramTrackingNumber } = useParams<{ trackingNumber?: string }>();
  const [input, setInput] = useState(paramTrackingNumber ?? '');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const doSearch = async (trackingNumber: string): Promise<void> => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setFetchError(null);
    setSearched(false);

    try {
      const data = await trackShipment(trimmed);
      setResult(data);
    } catch (err) {
      setResult(null);
      setFetchError(err instanceof Error ? err.message : 'Unable to fetch tracking info.');
    } finally {
      setIsLoading(false);
      setSearched(true);
    }
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    doSearch(input);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to={ROUTES.HOME}>
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-8" />
          </Link>
          <Link
            to={ROUTES.SIGN_IN}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Track Your Shipment</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your tracking number to get the latest status.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Enter tracking number (e.g. GX-1234567)"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>

        {/* API error */}
        {fetchError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {fetchError}
          </div>
        )}

        {/* Not found */}
        {searched && !result && !fetchError && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No shipment found</p>
            <p className="mt-1 text-xs text-gray-400">
              Check your tracking number and try again.
            </p>
          </div>
        )}

        {/* Results */}
        {result && (() => {
          const statusKey = resolveStatusKey(result);
          const style = statusStyles[statusKey];
          return (
            <div className="space-y-4">
              {/* Status card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Tracking number</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {result.trackingNumber ?? input.trim().toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {result.statusLabel}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  {result.origin && (
                    <div>
                      <p className="text-xs text-gray-400">Origin</p>
                      <p className="mt-0.5 text-sm font-medium text-gray-800">{result.origin}</p>
                    </div>
                  )}
                  {result.destination && (
                    <div>
                      <p className="text-xs text-gray-400">Destination</p>
                      <p className="mt-0.5 text-sm font-medium text-gray-800">{result.destination}</p>
                    </div>
                  )}
                  {result.estimatedDelivery && (
                    <div>
                      <p className="text-xs text-gray-400">Estimated Delivery</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-800">{result.estimatedDelivery}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Last Update</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-800">{result.lastUpdate}</p>
                  </div>
                </div>
              </div>

              {/* Last location */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                    <MapPin className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Current Location</p>
                    <p className="text-sm font-medium text-gray-800">{result.lastLocation}</p>
                  </div>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
                </div>
              </div>

              <p className="text-center text-xs text-gray-400">
                Have an account?{' '}
                <Link to={ROUTES.SIGN_IN} className="font-medium text-brand-500 hover:text-brand-600">
                  Sign in for more details
                </Link>
              </p>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
