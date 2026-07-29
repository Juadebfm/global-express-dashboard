import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useOrderTimeline } from '@/hooks';
import { ShipmentTimeline } from '@/pages/shared';

interface ShipmentTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

function ModalContent({ orderId }: { orderId: string }): ReactElement {
  const { data, isLoading, error } = useOrderTimeline(orderId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" aria-live="polite">
        <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        <p className="text-center text-sm text-gray-500">Loading tracking history…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6" role="alert">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load this shipment’s tracking history. Please close the window and try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tracking number</p>
        <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{data.trackingNumber}</p>
      </section>
      <ShipmentTimeline timeline={data.timeline} currentStatus={data.currentStatus} />
    </div>
  );
}

export function ShipmentTrackingModal({ orderId, onClose }: ShipmentTrackingModalProps): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <section
        aria-labelledby="shipment-tracking-title"
        aria-modal="true"
        role="dialog"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="shipment-tracking-title" className="text-lg font-semibold text-gray-900">
              Tracking timeline
            </h2>
            <p className="mt-1 text-sm text-gray-500">Live status history for this shipment.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Close tracking timeline"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain">
          <ModalContent orderId={orderId} />
        </div>
      </section>
    </div>
  );
}
