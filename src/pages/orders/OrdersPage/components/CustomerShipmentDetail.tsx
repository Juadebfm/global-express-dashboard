import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Check, Clock, Download, Package, Plane, Ship, User } from 'lucide-react';
import { Button } from '@/components/ui';
import type { OrderTimelineEvent } from '@/services/ordersService';
import { cn } from '@/utils';
import { formatDate } from '@/utils';
import type { OrderView } from '../types';
import { buildProgressSteps, getHeroInfo, getPaymentState } from '../utils/customerStatus';
import type { StepState } from '../utils/customerStatus';

// ── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500',
];
function avatarColor(name: string): string {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i] ?? 'bg-gray-400';
}

// ── Step icon ────────────────────────────────────────────────────────────────

function StepIcon({ label, state }: { label: string; state: StepState }): ReactElement {
  if (state === 'complete') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 shadow-sm">
        <Check className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-500 bg-white shadow-sm">
        {label === 'In transit' ? (
          <Plane className="h-4 w-4 text-brand-500" />
        ) : label === 'Arrived Lagos' ? (
          <Package className="h-4 w-4 text-brand-500" />
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
        )}
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
      {label === 'Delivered' ? (
        <Download className="h-4 w-4 text-gray-300" />
      ) : (
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
      )}
    </div>
  );
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

interface PickupCardProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (orderId: string, name: string, phone: string) => Promise<void>;
}

function PickupCard({ view, isPending, onSubmit }: PickupCardProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(view.pickupRepName);
  const [phone, setPhone] = useState(view.pickupRepPhone);
  const [error, setError] = useState<string | null>(null);

  const hasRep = Boolean(view.pickupRepName);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setError(null);
    try {
      await onSubmit(view.id, name.trim(), phone.trim());
      setEditing(false);
    } catch {
      setError('Could not save. Please try again.');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Who's collecting it</h3>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setName(view.pickupRepName); setPhone(view.pickupRepPhone); }}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition"
          >
            <span className="text-[10px]">✎</span> {hasRep ? 'Edit' : 'Set'}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={isPending}>Save</Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs font-medium text-gray-500 hover:text-gray-800">Cancel</button>
          </div>
        </form>
      ) : hasRep ? (
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', avatarColor(view.pickupRepName))}>
            {initials(view.pickupRepName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{view.pickupRepName}</p>
            <p className="text-xs text-gray-500">{view.pickupRepPhone} · will collect at Lagos office</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200">
            <User className="h-4 w-4 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">No pickup rep set yet</p>
            <p className="text-xs text-gray-400">Add who will collect the package at our Lagos office.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface CustomerShipmentDetailProps {
  view: OrderView;
  timeline: OrderTimelineEvent[];
  timelineLoading: boolean;
  onSettleBalance: () => void;
  updatePickupRepPending: boolean;
  onSubmitPickupRep: (orderId: string, name: string, phone: string) => Promise<void>;
}

export function CustomerShipmentDetail({
  view,
  timeline,
  timelineLoading,
  onSettleBalance,
  updatePickupRepPending,
  onSubmitPickupRep,
}: CustomerShipmentDetailProps): ReactElement {
  const steps = buildProgressSteps(view, timeline);
  const hero = getHeroInfo(view.statusV2);
  const paymentState = getPaymentState(view);

  const transportIcon = view.transportMode === 'sea'
    ? <Ship className="h-3.5 w-3.5" />
    : <Plane className="h-3.5 w-3.5" />;

  const transportLabel = view.transportMode === 'sea' ? 'Sea freight' : 'Air freight';

  const amountDisplay = view.amountDue
    ? `$${view.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : view.finalChargeUsd
      ? `$${view.finalChargeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : '—';

  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {view.origin} <span className="text-gray-400">→</span> {view.destination}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
            <span>{view.trackingNumber}</span>
            <span>•</span>
            <span className="flex items-center gap-1">{transportIcon}{transportLabel}</span>
          </div>
        </div>
        <span className={cn(
          'mt-1 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold',
          paymentState === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
          paymentState === 'due' ? 'border-amber-200 bg-amber-50 text-amber-700' :
          'border-gray-200 bg-gray-50 text-gray-600',
        )}>
          {view.statusLabel || view.statusV2}
        </span>
      </div>

      {/* ── Where's my shipment? ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Where's my shipment?</p>
          {/* ETA placeholder — wire in when BE exposes estimated arrival */}
        </div>
        <h2 className="mt-1 text-xl font-bold text-gray-900">{hero.headline}</h2>
        <p className="mt-1 text-sm text-gray-500">{hero.subtitle}</p>

        {/* 5-step progress */}
        <div className="mt-6 flex items-start gap-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* Left connector */}
                <div className={cn('h-0.5 flex-1', i === 0 ? 'invisible' : step.state !== 'pending' || steps[i - 1]?.state !== 'pending' ? 'bg-brand-500' : 'bg-gray-200')} />
                <StepIcon label={step.label} state={step.state} />
                {/* Right connector */}
                <div className={cn('h-0.5 flex-1', i === steps.length - 1 ? 'invisible' : step.state === 'complete' ? 'bg-brand-500' : 'bg-gray-200')} />
              </div>
              <p className={cn('mt-2 text-center text-xs font-semibold', step.state === 'pending' ? 'text-gray-400' : 'text-gray-700')}>
                {step.label}
              </p>
              <p className={cn('mt-0.5 text-center text-[11px]', step.state === 'active' ? 'font-bold text-brand-500' : 'text-gray-400')}>
                {step.date ?? (step.state === 'pending' ? '' : '—')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Balance card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <span className="text-base">🧾</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {paymentState === 'paid'
                  ? 'Paid in full'
                  : paymentState === 'due'
                    ? 'Balance due'
                    : 'Balance — payable on arrival'}
              </p>
              <p className="text-xs text-gray-400">
                {paymentState === 'paid'
                  ? `${amountDisplay} confirmed`
                  : paymentState === 'due'
                    ? 'Transfer the balance and upload your receipt to clear it.'
                    : 'You settle this by bank transfer once it reaches our Lagos office.'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {paymentState === 'paid' ? (
              <>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Paid in full</span>
                </div>
                <span className="text-base font-bold text-gray-900">{amountDisplay}</span>
              </>
            ) : paymentState === 'due' ? (
              <>
                <span className="text-xl font-bold text-brand-500">{amountDisplay}</span>
                <Button size="sm" onClick={onSettleBalance}>Settle balance</Button>
              </>
            ) : (
              <>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">Nothing to do yet</span>
                {view.amountDue || view.finalChargeUsd ? (
                  <span className="text-base font-bold text-gray-800">{amountDisplay}</span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Recipient + Pickup ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recipient */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">Recipient</h3>
          </div>
          <div className="space-y-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Name</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{view.recipientName || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Phone</p>
              <p className="mt-0.5 text-sm text-gray-700">{view.recipientPhone || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Delivers To</p>
              <p className="mt-0.5 text-sm text-gray-700">{view.recipientAddress || '—'}</p>
            </div>
          </div>
        </div>

        {/* Pickup rep */}
        <PickupCard
          view={view}
          isPending={updatePickupRepPending}
          onSubmit={onSubmitPickupRep}
        />
      </div>

      {/* ── Activity ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Activity</h3>
        </div>

        {timelineLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        )}

        {!timelineLoading && sortedTimeline.length === 0 && (
          <p className="text-sm text-gray-400">No activity yet.</p>
        )}

        <ol className="space-y-0">
          {sortedTimeline.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedTimeline.length - 1;
            return (
              <li key={`${item.status}-${item.timestamp}`} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white', isFirst ? 'bg-brand-500' : 'bg-gray-300')} />
                  {!isLast && <div className="mt-0.5 h-full w-px bg-gray-200" />}
                </div>
                <div className="pb-5">
                  <p className={cn('text-sm font-semibold', isFirst ? 'text-gray-900' : 'text-gray-600')}>
                    {item.statusLabel || item.status}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(item.timestamp, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
