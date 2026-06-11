import type { OrderTimelineEvent } from '@/services/ordersService';
import type { OrderView } from '../types';

// ── 5-step customer progress model ─────────────────────────────────────────

export type StepState = 'complete' | 'active' | 'pending';

export interface ProgressStep {
  label: string;
  state: StepState;
  date: string | null;
}

const TRANSIT_STATUSES = [
  'DISPATCHED_TO_ORIGIN_AIRPORT', 'AT_ORIGIN_AIRPORT', 'BOARDED_ON_FLIGHT', 'FLIGHT_DEPARTED',
  'DISPATCHED_TO_ORIGIN_PORT', 'AT_ORIGIN_PORT', 'LOADED_ON_VESSEL', 'VESSEL_DEPARTED',
];
const ARRIVAL_STATUSES = [
  'FLIGHT_LANDED_LAGOS', 'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS', 'IN_TRANSIT_TO_LAGOS_OFFICE', 'READY_FOR_PICKUP',
];
const WAREHOUSE_STATUSES = ['WAREHOUSE_RECEIVED', 'WAREHOUSE_VERIFIED_PRICED'];

// Returns 0-4 for the currently active step index.
export function getActiveStep(statusV2: string): number {
  const s = statusV2.toUpperCase();
  if (s === 'PICKED_UP_COMPLETED') return 4;
  if (ARRIVAL_STATUSES.includes(s)) return 3;
  if (TRANSIT_STATUSES.includes(s)) return 2;
  if (WAREHOUSE_STATUSES.includes(s)) return 1;
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
    { label: 'At Korea hub', state: active > 1 ? 'complete' : active === 1 ? 'active' : 'pending', date: stepDate(1, WAREHOUSE_STATUSES) },
    { label: 'In transit', state: active > 2 ? 'complete' : active === 2 ? 'active' : 'pending', date: stepDate(2, TRANSIT_STATUSES) },
    { label: 'Arrived Lagos', state: active > 3 ? 'complete' : active === 3 ? 'active' : 'pending', date: stepDate(3, ARRIVAL_STATUSES) },
    { label: 'Delivered', state: active === 4 ? 'active' : 'pending', date: stepDate(4, ['PICKED_UP_COMPLETED']) },
  ];
}

// ── Human-readable hero section ─────────────────────────────────────────────

export interface HeroInfo {
  headline: string;
  subtitle: string;
}

export function getHeroInfo(statusV2: string): HeroInfo {
  const s = statusV2.toUpperCase();

  if (s === 'PICKED_UP_COMPLETED') return {
    headline: 'Delivered — collected in Lagos',
    subtitle: 'Your shipment has been collected. Thanks for choosing Global Express.',
  };
  if (s === 'READY_FOR_PICKUP') return {
    headline: 'Ready to collect in Lagos',
    subtitle: 'At our Ajao Estate office. Bring ID, or send your pickup rep.',
  };
  if (['FLIGHT_LANDED_LAGOS', 'VESSEL_ARRIVED_LAGOS_PORT', 'CUSTOMS_CLEARED_LAGOS', 'IN_TRANSIT_TO_LAGOS_OFFICE'].includes(s)) return {
    headline: 'Arrived in Lagos — clearing customs',
    subtitle: 'Your shipment has landed and is being processed. We\'ll notify you when it\'s ready to collect.',
  };
  if (['FLIGHT_DEPARTED', 'BOARDED_ON_FLIGHT', 'AT_ORIGIN_AIRPORT', 'DISPATCHED_TO_ORIGIN_AIRPORT'].includes(s)) return {
    headline: 'In the air, on its way to Lagos',
    subtitle: "Your shipment has left the Korea hub and is heading to our Lagos office. We'll notify you the moment it lands.",
  };
  if (['VESSEL_DEPARTED', 'LOADED_ON_VESSEL', 'AT_ORIGIN_PORT', 'DISPATCHED_TO_ORIGIN_PORT'].includes(s)) return {
    headline: 'On the sea, heading to Lagos',
    subtitle: 'Your shipment is at sea and on its way to Lagos port.',
  };
  if (WAREHOUSE_STATUSES.includes(s)) return {
    headline: 'At the Korea hub — being processed',
    subtitle: "Your items have arrived at our Korea warehouse. We're weighing and pricing them now.",
  };
  if (s === 'AWAITING_WAREHOUSE_RECEIPT') return {
    headline: 'Waiting to arrive at the Korea hub',
    subtitle: "We're expecting your shipment at our Korea warehouse. It should arrive soon.",
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
