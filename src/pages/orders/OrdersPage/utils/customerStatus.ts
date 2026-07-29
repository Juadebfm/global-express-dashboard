import type { OrderTimelineEvent } from '@/services/ordersService';
import type { OrderView } from '../types';

// ── 5-step customer progress model ─────────────────────────────────────────

export type StepState = 'complete' | 'active' | 'pending';

export interface ProgressStep {
  label: string;
  state: StepState;
  date: string | null;
}

// `statusV2` here is always the customer-facing taxonomy (PROCESSING_AT_ORIGIN,
// WAREHOUSE_RECEIVED, VERIFIED_AND_PRICED, PREPARING_FOR_DEPARTURE, IN_TRANSIT,
// ARRIVED_IN_NIGERIA, OUT_FOR_DELIVERY, READY_FOR_PICKUP, DELIVERED, ON_HOLD,
// CANCELLED, ACTION_REQUIRED) — the backend maps raw internal statusV2 codes
// to this set before a customer-role response ever reaches the FE.
const HUB_STATUSES = ['WAREHOUSE_RECEIVED', 'VERIFIED_AND_PRICED', 'PREPARING_FOR_DEPARTURE'];
const ARRIVAL_STATUSES = ['ARRIVED_IN_NIGERIA', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'];

// Returns 0-4 for the currently active step index.
export function getActiveStep(statusV2: string): number {
  const s = statusV2.toUpperCase();
  if (s === 'DELIVERED') return 4;
  if (ARRIVAL_STATUSES.includes(s)) return 3;
  if (s === 'IN_TRANSIT') return 2;
  if (HUB_STATUSES.includes(s)) return 1;
  return 0;
}

// Extracts the first timeline timestamp whose status belongs to a given set.
function firstEventDate(events: OrderTimelineEvent[], statuses: string[]): string | null {
  const set = new Set(statuses.map((s) => s.toUpperCase()));
  const match = events.find((e) => set.has(e.status.toUpperCase()));
  return match?.timestamp ?? null;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function buildProgressSteps(
  view: OrderView,
  events: OrderTimelineEvent[],
): ProgressStep[] {
  const active = getActiveStep(view.statusV2);

  const stepDate = (index: number, statuses: string[]): string | null => {
    if (index === 0) return fmtDate(view.createdAt);
    const date = fmtDate(firstEventDate(events, statuses));
    return index < active ? date : index === active ? 'Now' : null;
  };

  return [
    { label: 'Order placed', state: active > 0 ? 'complete' : 'active', date: fmtDate(view.createdAt) },
    { label: 'At Korea hub', state: active > 1 ? 'complete' : active === 1 ? 'active' : 'pending', date: stepDate(1, HUB_STATUSES) },
    { label: 'In transit', state: active > 2 ? 'complete' : active === 2 ? 'active' : 'pending', date: stepDate(2, ['IN_TRANSIT']) },
    { label: 'Arrived Lagos', state: active > 3 ? 'complete' : active === 3 ? 'active' : 'pending', date: stepDate(3, ARRIVAL_STATUSES) },
    { label: 'Delivered', state: active === 4 ? 'active' : 'pending', date: stepDate(4, ['DELIVERED']) },
  ];
}

// ── Human-readable hero section ─────────────────────────────────────────────

export interface HeroInfo {
  headline: string;
  subtitle: string;
}

export function getHeroInfo(statusV2: string): HeroInfo {
  const s = statusV2.toUpperCase();

  if (s === 'DELIVERED') return {
    headline: 'Delivered',
    subtitle: 'Your shipment has been delivered. Thanks for choosing Global Express.',
  };
  if (s === 'OUT_FOR_DELIVERY') return {
    headline: 'Out for delivery',
    subtitle: "Your shipment is on its way to the delivery address. We'll notify you once it arrives.",
  };
  if (s === 'READY_FOR_PICKUP') return {
    headline: 'Ready to collect in Lagos',
    subtitle: 'At our Ajao Estate office. Bring ID, or send your pickup rep.',
  };
  if (s === 'ARRIVED_IN_NIGERIA') return {
    headline: 'Arrived in Lagos — clearing customs',
    subtitle: "Your shipment has landed and is being processed. We'll notify you when it's ready to collect.",
  };
  if (s === 'IN_TRANSIT') return {
    headline: 'On its way to Lagos',
    subtitle: "Your shipment has left the Korea hub and is heading to Lagos. We'll notify you the moment it lands.",
  };
  if (s === 'PREPARING_FOR_DEPARTURE') return {
    headline: 'Preparing for departure',
    subtitle: 'Your shipment is packed and being prepared to leave our Korea hub.',
  };
  if (s === 'VERIFIED_AND_PRICED') return {
    headline: 'Verified, weighed & priced',
    subtitle: "Your goods have been checked and priced at our Korea hub. They're ready to ship.",
  };
  if (s === 'WAREHOUSE_RECEIVED') return {
    headline: 'At the Korea hub — being processed',
    subtitle: "Your items have arrived at our Korea warehouse. We're weighing and pricing them now.",
  };
  if (s === 'ON_HOLD') return {
    headline: 'On hold',
    subtitle: 'Your shipment is currently on hold. Contact support for more information.',
  };
  if (s === 'CANCELLED') return {
    headline: 'Cancelled',
    subtitle: 'This shipment has been cancelled.',
  };
  if (s === 'ACTION_REQUIRED') return {
    headline: 'Action required',
    subtitle: "There's an issue with your shipment that needs your attention. Please contact support.",
  };
  return {
    headline: 'Order placed',
    subtitle: "Your order has been created. We'll update you as it progresses.",
  };
}

// ── Payment state ───────────────────────────────────────────────────────────

export type PaymentState = 'paid' | 'in_progress' | 'due' | 'not_priced';

export function getPaymentState(view: OrderView): PaymentState {
  const status = view.paymentCollectionStatus.toUpperCase();
  if (status === 'PAID_IN_FULL') return 'paid';
  if (status === 'PAYMENT_IN_PROGRESS') return 'in_progress';
  if (view.amountDue !== null) return 'due';
  return 'not_priced';
}
