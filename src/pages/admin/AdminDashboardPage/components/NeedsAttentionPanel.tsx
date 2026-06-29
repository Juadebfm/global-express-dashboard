import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useOrders } from '@/hooks';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

type Tone = 'red' | 'amber' | 'blue' | 'gray';

interface StageConfig {
  statusV2: string;
  label: string;
  tone: Tone;
}

const STAGES: StageConfig[] = [
  { statusV2: 'PREORDER_SUBMITTED',          label: 'Booking Submitted',  tone: 'amber' },
  { statusV2: 'AWAITING_WAREHOUSE_RECEIPT', label: 'Awaiting Warehouse', tone: 'gray'  },
  { statusV2: 'WAREHOUSE_RECEIVED',         label: 'Warehouse Received', tone: 'amber' },
  { statusV2: 'WAREHOUSE_VERIFIED_PRICED',  label: 'Verified & Priced',  tone: 'blue'  },
  { statusV2: 'ON_HOLD',                    label: 'On Hold',            tone: 'red'   },
];

const TONE: Record<Tone, string> = {
  red:   'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  blue:  'bg-blue-50 text-blue-800',
  gray:  'bg-gray-100 text-gray-600',
};

export function NeedsAttentionPanel(): ReactElement {
  // One hook call per stage — React Query dedupes identical keys across renders.
  // limit=1 so each request is minimal; we only need pagination.total.
  const s0 = useOrders(1, 1, STAGES[0].statusV2);
  const s1 = useOrders(1, 1, STAGES[1].statusV2);
  const s2 = useOrders(1, 1, STAGES[2].statusV2);
  const s3 = useOrders(1, 1, STAGES[3].statusV2);
  const s4 = useOrders(1, 1, STAGES[4].statusV2);

  const counts   = [s0.total, s1.total, s2.total, s3.total, s4.total];
  const loading  = [s0.isLoading, s1.isLoading, s2.isLoading, s3.isLoading, s4.isLoading];
  const errors   = [s0.error, s1.error, s2.error, s3.error, s4.error];
  const grandTotal = counts.reduce((a, b) => a + b, 0);
  const anyLoading = loading.some(Boolean);
  const anyError   = errors.some(Boolean);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
          <p className="mt-0.5 text-xs text-gray-500">Orders waiting on a staff action</p>
        </div>
        <Link
          to={ROUTES.OPERATIONS}
          className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition"
        >
          Operations
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {anyError ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-red-500">Failed to load order counts</p>
        </div>
      ) : !anyLoading && grandTotal === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-medium text-gray-700">All clear</p>
          <p className="text-xs text-gray-400">No orders waiting for action right now</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {STAGES.map((stage, i) => (
            <div key={stage.statusV2} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">{stage.label}</span>
              {loading[i] ? (
                <span className="h-5 w-8 animate-pulse rounded-full bg-gray-100" />
              ) : (
                <span
                  className={cn(
                    'inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    counts[i] > 0 ? TONE[stage.tone] : 'bg-gray-50 text-gray-400',
                  )}
                >
                  {counts[i]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
