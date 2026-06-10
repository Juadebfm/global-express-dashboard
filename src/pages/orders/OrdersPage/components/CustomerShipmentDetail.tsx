import type { FormEvent, ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Mail,
  MapPin,
  MessageCircle,
  Plane,
  Share2,
  Ship,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { OrderTimelineEvent } from '@/services/ordersService';
import { cn, formatDate } from '@/utils';
import type { OrderView } from '../types';
import { buildProgressSteps, getHeroInfo, getPaymentState } from '../utils/customerStatus';
import type { StepState } from '../utils/customerStatus';

// ── Tracking share ───────────────────────────────────────────────────────────

function buildShareText(trackingNumber: string): string {
  return `My shipment tracking number with Global Express is: ${trackingNumber}\n\nTrack it here: ${window.location.origin}/track?q=${encodeURIComponent(trackingNumber)}`;
}

function ShareModal({ trackingNumber, onClose }: { trackingNumber: string; onClose: () => void }): ReactElement {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(trackingNumber);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [trackingNumber]);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const kakaoUrl = `kakaotalk://msg/send?text=${encodeURIComponent(shareText)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent('My Global Express Tracking Number')}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Share tracking number</h3>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{trackingNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Copy row */}
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-800">{copied ? 'Copied!' : 'Copy tracking number'}</p>
            <p className="text-xs text-gray-400">Paste it anywhere</p>
          </div>
        </button>

        {/* Share options */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Share via</p>
        <div className="grid grid-cols-3 gap-3">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition hover:bg-green-50 hover:border-green-200"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </span>
            <span className="text-xs font-medium text-gray-700">WhatsApp</span>
          </a>

          {/* KakaoTalk */}
          <a
            href={kakaoUrl}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition hover:bg-yellow-50 hover:border-yellow-200"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-5 w-5 text-yellow-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.9 1.82 5.45 4.56 6.97L5.5 21l4.12-2.19A11.5 11.5 0 0 0 12 19.5c5.52 0 10-3.69 10-8.25S17.52 3 12 3Z" />
              </svg>
            </span>
            <span className="text-xs font-medium text-gray-700">KakaoTalk</span>
          </a>

          {/* Email */}
          <a
            href={mailUrl}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition hover:bg-blue-50 hover:border-blue-200"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </span>
            <span className="text-xs font-medium text-gray-700">Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500'];
function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? 'bg-gray-400';
}

const ARRIVED_SET = new Set([
  'FLIGHT_LANDED_LAGOS', 'VESSEL_ARRIVED_LAGOS_PORT', 'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE', 'READY_FOR_PICKUP', 'PICKED_UP_COMPLETED',
]);
const TRANSIT_SET = new Set([
  'DISPATCHED_TO_ORIGIN_AIRPORT', 'AT_ORIGIN_AIRPORT', 'BOARDED_ON_FLIGHT', 'FLIGHT_DEPARTED',
  'DISPATCHED_TO_ORIGIN_PORT', 'AT_ORIGIN_PORT', 'LOADED_ON_VESSEL', 'VESSEL_DEPARTED',
]);

function statusDotColor(statusV2: string): string {
  const s = statusV2.toUpperCase();
  if (ARRIVED_SET.has(s)) return 'bg-emerald-500';
  if (TRANSIT_SET.has(s)) return 'bg-amber-500';
  return 'bg-gray-400';
}

// ── Step icon (vertical) ─────────────────────────────────────────────────────

function StepIcon({ label, state }: { label: string; state: StepState }): ReactElement {
  if (state === 'complete') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500">
        <Check className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (state === 'active') {
    const icon =
      label === 'Arrived Lagos' ? <MapPin className="h-4 w-4 text-brand-500" /> :
      label === 'In transit'    ? <Plane className="h-4 w-4 text-brand-500" /> :
      label === 'Delivered'     ? <Download className="h-4 w-4 text-brand-500" /> :
      <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />;
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-white shadow-sm">
        {icon}
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
      {label === 'Delivered'
        ? <Download className="h-4 w-4 text-gray-300" />
        : <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />}
    </div>
  );
}

// ── Pickup card ───────────────────────────────────────────────────────────────

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
          <User className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Who's collecting</h3>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setName(view.pickupRepName); setPhone(view.pickupRepPhone); }}
            className="text-xs font-medium text-brand-500 hover:text-brand-600 transition"
          >
            {hasRep ? 'Edit' : 'Set'}
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
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(view.pickupRepName))}>
            {initials(view.pickupRepName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{view.pickupRepName}</p>
            <p className="text-xs text-gray-500">{view.pickupRepPhone}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200">
            <User className="h-4 w-4 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">No pickup rep yet</p>
            <p className="text-xs text-gray-400">Add who will collect at our Lagos office.</p>
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
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);

  const handleCopyTracking = useCallback(async () => {
    await navigator.clipboard.writeText(view.trackingNumber);
    setTrackingCopied(true);
    setTimeout(() => setTrackingCopied(false), 2000);
  }, [view.trackingNumber]);

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
  const displayedEvents = showAllActivity ? sortedTimeline : sortedTimeline.slice(0, 1);

  const statusDot = statusDotColor(view.statusV2);
  const badgeClass =
    paymentState === 'paid' || ARRIVED_SET.has(view.statusV2.toUpperCase())
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : paymentState === 'due'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-gray-200 bg-gray-50 text-gray-600';

  return (
    <div className="space-y-3">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {view.origin} <span className="text-gray-400">→</span> {view.destination}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-gray-600">{view.trackingNumber}</span>
            <button
              type="button"
              onClick={() => void handleCopyTracking()}
              title="Copy tracking number"
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              {trackingCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              title="Share tracking number"
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">{transportIcon} {transportLabel}</span>
        </p>

        {shareOpen && (
          <ShareModal trackingNumber={view.trackingNumber} onClose={() => setShareOpen(false)} />
        )}
        <div className="mt-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', badgeClass)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} />
            {view.statusLabel || view.statusV2}
          </span>
        </div>
      </div>

      {/* ── Where's my shipment? ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Where's my shipment?</p>
        <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">{hero.headline}</h2>
        <p className="mt-1 text-sm text-gray-500">{hero.subtitle}</p>

        {/* Vertical step list */}
        <div className="mt-5">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              {/* Icon + vertical connector */}
              <div className="flex flex-col items-center">
                <StepIcon label={step.label} state={step.state} />
                {i < steps.length - 1 && (
                  <div
                    className={cn('w-0.5 flex-1 my-0.5', step.state === 'complete' ? 'bg-brand-500' : 'bg-gray-200')}
                    style={{ minHeight: 20 }}
                  />
                )}
              </div>
              {/* Label + date */}
              <div className={cn('flex flex-1 min-w-0 items-center justify-between', i < steps.length - 1 ? 'pb-4' : '')}>
                <p className={cn('text-sm font-semibold', step.state === 'pending' ? 'text-gray-400' : 'text-gray-900')}>
                  {step.label}
                </p>
                <p className={cn('ml-2 shrink-0 text-sm', step.state === 'active' ? 'font-bold text-brand-500' : 'text-gray-400')}>
                  {step.date ?? '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Balance card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {paymentState === 'paid' ? (
          /* Paid */
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-700">Paid in full</p>
              <p className="text-xs text-gray-500">{amountDisplay} · confirmed</p>
            </div>
            <Button size="sm" variant="secondary">Receipt</Button>
          </div>
        ) : paymentState === 'due' ? (
          /* Confirmed amount — show exact balance */
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <span className="text-base">🧾</span>
              </div>
              <p className="flex-1 text-sm font-bold text-gray-900">Balance due</p>
              <span className="shrink-0 text-base font-bold text-brand-500">{amountDisplay}</span>
            </div>
            <div className="flex items-center justify-between gap-3 pl-12">
              <p className="text-xs text-gray-400">
                {view.paymentNote ?? 'Transfer and upload your receipt to clear it.'}
              </p>
              <Button size="sm" onClick={onSettleBalance} className="shrink-0">Make Payment</Button>
            </div>
          </div>
        ) : (
          /* Not yet priced — info only, no payment action */
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <span className="text-base">🧾</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Balance pending</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {view.paymentNote ?? 'Final amount confirmed after warehouse verification.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Who's collecting ── */}
      <PickupCard
        view={view}
        isPending={updatePickupRepPending}
        onSubmit={onSubmitPickupRep}
      />

      {/* ── Latest update ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Latest update</h3>
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
          {displayedEvents.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === displayedEvents.length - 1;
            return (
              <li key={`${item.status}-${item.timestamp}`} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white', isFirst ? 'bg-brand-500' : 'bg-gray-300')} />
                  {!isLast && <div className="mt-0.5 w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-4">
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

        {sortedTimeline.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAllActivity((v) => !v)}
            className="mt-1 flex w-full items-center justify-center gap-1.5 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            {showAllActivity
              ? <><ChevronUp className="h-4 w-4" /> Show less</>
              : <><ChevronDown className="h-4 w-4" /> View full activity</>}
          </button>
        )}
      </div>
    </div>
  );
}
