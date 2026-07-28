import type { ReactElement } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { QueueKind } from './QueueShell';

const QUEUE_META: Record<QueueKind, { label: string; done: string }> = {
  preorder: {
    label: 'New orders',
    done: 'All new bookings have been registered for warehouse handling.',
  },
  arrival: {
    label: 'Awaiting arrivals',
    done: 'No registered orders are waiting for their goods to arrive at the warehouse.',
  },
  verify: {
    label: 'Verify packages',
    done: "All packages have been verified — nothing left to process right now.",
  },
  holds: {
    label: 'Resolve holds',
    done: "No active holds — all on-hold orders have been resolved.",
  },
  batch: {
    label: 'Assign to batch',
    done: "All priced & paid orders are assigned to a batch.",
  },
  payment: {
    label: 'Collect payment',
    done: "No outstanding payments — all orders are settled.",
  },
  escalated: {
    label: 'Supervisor review',
    done: "No escalated orders — all flagged holds have been resolved.",
  },
};

interface OtherQueue {
  kind: QueueKind;
  count: number;
  onStart: () => void;
}

interface AllCaughtUpProps {
  queueType: QueueKind;
  otherQueues: OtherQueue[];
  onExit: () => void;
}

export function AllCaughtUp({ queueType, otherQueues, onExit }: AllCaughtUpProps): ReactElement {
  const meta = QUEUE_META[queueType];

  const pending = otherQueues.filter((q) => q.count > 0);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">All caught up!</h2>
        <p className="mt-2 text-sm text-gray-500">{meta.done}</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2 text-left">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
            Other tasks to work on
          </p>
          {pending.map((q) => {
            const qm = QUEUE_META[q.kind];
            return (
              <button
                key={q.kind}
                type="button"
                onClick={q.onStart}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{qm.label}</p>
                  <p className="text-xs text-gray-500">{q.count} order{q.count !== 1 ? 's' : ''} waiting</p>
                </div>
                <span className="text-sm font-semibold text-brand-500">Start →</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onExit}
        className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        Back to overview
      </button>
    </div>
  );
}
