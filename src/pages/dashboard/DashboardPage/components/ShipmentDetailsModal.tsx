import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Phone,
  Plane,
  Ship,
  Truck,
  X,
} from 'lucide-react';
import { useOrderDetail, useOrderTimeline } from '@/hooks';
import { ORIGIN_WAREHOUSE, ROUTES } from '@/constants';
import { cn, formatDate } from '@/utils';
import type { ApiOrder } from '@/types';
import type { GoodsBreakdownItem } from '@/services';
import { toView } from '@/pages/shared';

interface ShipmentDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

// `order.statusV2` here is the customer-facing taxonomy (GET /orders/:id
// maps it server-side) — never raw internal statusV2 codes.
const WAREHOUSE_STATUSES = new Set([
  'PROCESSING_AT_ORIGIN',
  'WAREHOUSE_RECEIVED',
  'VERIFIED_AND_PRICED',
  'PREPARING_FOR_DEPARTURE',
]);

function displayValue(value: string | null | undefined): string {
  return value?.trim() || 'Not provided';
}

function formatMetric(value: number, unit: string, maximumFractionDigits = 2): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${unit}`;
}

function formatMoney(value: string | null | undefined): string | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `$${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function shipmentMode(order: ApiOrder): { label: string; icon: ReactElement } {
  if (order.shipmentType === 'd2d') {
    return { label: 'Door-to-door', icon: <Truck className="h-4 w-4" /> };
  }
  if (order.transportMode === 'sea' || order.shipmentType === 'ocean') {
    return { label: 'Sea freight', icon: <Ship className="h-4 w-4" /> };
  }
  return { label: 'Air freight', icon: <Plane className="h-4 w-4" /> };
}

function warehouseMessage(status: string): { title: string; description: string; complete: boolean } {
  switch (status) {
    case 'PROCESSING_AT_ORIGIN':
      return {
        title: 'Preparing for warehouse receipt',
        description: 'Your booking has been received. We’re expecting your goods at the Global Express Korea warehouse.',
        complete: false,
      };
    case 'WAREHOUSE_RECEIVED':
      return {
        title: 'Received at warehouse',
        description: 'Your goods have arrived and are being checked by our warehouse team.',
        complete: false,
      };
    case 'VERIFIED_AND_PRICED':
      return {
        title: 'Verified at warehouse',
        description: 'Your goods have been measured and priced at our warehouse.',
        complete: true,
      };
    case 'PREPARING_FOR_DEPARTURE':
      return {
        title: 'Preparing for departure',
        description: 'Your shipment is packed and being prepared to leave our Korea hub.',
        complete: true,
      };
    default:
      return {
        title: 'Warehouse handling complete',
        description: 'Your goods have completed warehouse handling and are progressing through delivery.',
        complete: true,
      };
  }
}

function hasWarehouseHandling(order: ApiOrder, goods: GoodsBreakdownItem[]): boolean {
  return Boolean(
    order.isPreorder ||
      order.warehouseId ||
      WAREHOUSE_STATUSES.has(order.statusV2) ||
      goods.some((item) => item.arrivalAt),
  );
}

function DetailItem({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-gray-800">{value}</dd>
    </div>
  );
}

function GoodsCard({ goods, index }: { goods: GoodsBreakdownItem; index: number }): ReactElement {
  const dimensions = goods.dimensionsCm;
  const hasDimensions = Boolean(
    dimensions && (dimensions.length > 0 || dimensions.width > 0 || dimensions.height > 0),
  );

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Package className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {goods.description || `Goods item ${index + 1}`}
            </h4>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              {goods.quantity} {goods.quantity === 1 ? 'item' : 'items'}
            </span>
          </div>
          {goods.itemType && <p className="mt-1 text-xs text-gray-500">{goods.itemType}</p>}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
        <DetailItem label="Weight" value={formatMetric(goods.weightKg, 'kg', 3)} />
        <DetailItem label="Volume" value={formatMetric(goods.cbm, 'CBM', 6)} />
        {hasDimensions && dimensions && (
          <DetailItem
            label="Dimensions"
            value={`${dimensions.length} × ${dimensions.width} × ${dimensions.height} cm`}
          />
        )}
        {goods.arrivalAt && (
          <DetailItem
            label="Received at warehouse"
            value={formatDate(goods.arrivalAt, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        )}
        {goods.supplierName && <DetailItem label="Supplier" value={goods.supplierName} />}
      </dl>

      {goods.requiresExtraTruckMovement && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This item requires additional local truck handling.
        </p>
      )}
    </article>
  );
}

function ModalContent({ orderId }: { orderId: string }): ReactElement {
  const navigate = useNavigate();
  const orderQuery = useOrderDetail(orderId);
  const timelineQuery = useOrderTimeline(orderId);
  const isLoading = orderQuery.isLoading || timelineQuery.isLoading;
  const error = orderQuery.error ?? timelineQuery.error;
  const order = orderQuery.data;
  const timeline = timelineQuery.data;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" aria-live="polite">
        <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        <p className="text-center text-sm text-gray-500">Loading shipment details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6" role="alert">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load this shipment’s details. Please close the window and try again.
        </div>
      </div>
    );
  }

  const goods = timeline?.goodsBreakdown ?? [];
  const mode = shipmentMode(order);
  const warehouse = hasWarehouseHandling(order, goods)
    ? warehouseMessage(order.statusV2)
    : null;
  const declaredValue = formatMoney(order.declaredValue);
  const view = toView(order);
  const amountDue = view.amountDue;

  return (
    <div className="space-y-5 p-6">
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tracking number</p>
            <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{order.trackingNumber}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {mode.icon}
            {mode.label}
          </span>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>{displayValue(order.origin)} <span className="px-1 text-gray-400">→</span> {displayValue(order.destination)}</span>
        </div>
        {order.eta && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            Estimated delivery: {formatDate(order.eta, { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </section>

      {amountDue != null && amountDue > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Balance due</p>
            <p className="mt-0.5 text-xl font-bold text-amber-900">
              ${amountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${ROUTES.ORDERS}?select=${encodeURIComponent(order.id)}&pay=1`)}
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Pay now
          </button>
        </section>
      ) : view.finalChargeUsd != null && view.finalChargeUsd > 0 ? (
        <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payment status</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-900">Paid in full</p>
          </div>
        </section>
      ) : null}

      {warehouse && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
              {warehouse.complete ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{warehouse.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{warehouse.description}</p>
              <p className="mt-3 text-xs font-medium text-brand-700">
                {ORIGIN_WAREHOUSE.company} · {ORIGIN_WAREHOUSE.address}
              </p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Box className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Goods details</h3>
        </div>
        {goods.length > 0 ? (
          <div className="space-y-3">
            {goods.map((item, index) => <GoodsCard key={`${item.description}-${index}`} goods={item} index={index} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-800">{displayValue(order.description)}</p>
            <p className="mt-1 text-sm text-gray-500">
              Item-level measurements will appear here after warehouse intake.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Booking details</h3>
        <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <DetailItem label="Declared value" value={declaredValue ?? 'Not provided'} />
          <DetailItem label="Declared weight" value={order.weight ? `${order.weight} kg` : 'Not provided'} />
          <DetailItem label="Recipient" value={displayValue(order.recipientName)} />
          <DetailItem label="Recipient phone" value={displayValue(order.recipientPhone)} />
          <DetailItem label="Delivery address" value={displayValue(order.recipientAddress)} />
          {order.sourcingSupplierName && (
            <DetailItem label="Sourcing supplier" value={order.sourcingSupplierName} />
          )}
        </dl>
        {order.sourcingSupplierPhone && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Phone className="h-4 w-4" /> Supplier contact: {order.sourcingSupplierPhone}
          </p>
        )}
        {order.departureDate && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" /> Departure: {formatDate(order.departureDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </section>
    </div>
  );
}

export function ShipmentDetailsModal({ orderId, onClose }: ShipmentDetailsModalProps): ReactElement {
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
        aria-labelledby="shipment-details-title"
        aria-modal="true"
        role="dialog"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="shipment-details-title" className="text-lg font-semibold text-gray-900">Shipment details</h2>
            <p className="mt-1 text-sm text-gray-500">Goods, booking, and warehouse handling in one place.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Close shipment details"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className={cn('overflow-y-auto', 'overscroll-contain')}>
          <ModalContent orderId={orderId} />
        </div>
      </section>
    </div>
  );
}
