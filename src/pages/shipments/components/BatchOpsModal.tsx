import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  useApproveBatchCutoff,
  useInternalTrackByMasterTracking,
  useMoveBatchToNext,
  useUpdateBatchCarrierInfo,
  useUpdateBatchStatus,
} from '@/hooks';
import {
  batchCarrierInfoSchema,
  batchMoveToNextSchema,
  batchStatusSchema,
  type BatchCarrierInfoFormData,
  type BatchMoveToNextFormData,
  type BatchStatusFormData,
} from '@/components/forms';
import type {
  DispatchBatchCarrierInfoPayload,
  DispatchBatchMoveToNextPayload,
} from '@/types';

const STATUS_OPTIONS = [
  'AWAITING_WAREHOUSE_RECEIPT',
  'WAREHOUSE_RECEIVED',
  'CLAIM_APPROVED_PENDING_BULK_PROCESSING',
  'WAREHOUSE_VERIFIED_PRICED',
  'DISPATCHED_TO_ORIGIN_AIRPORT',
  'AT_ORIGIN_AIRPORT',
  'BOARDED_ON_FLIGHT',
  'FLIGHT_DEPARTED',
  'FLIGHT_LANDED_LAGOS',
  'DISPATCHED_TO_ORIGIN_PORT',
  'AT_ORIGIN_PORT',
  'LOADED_ON_VESSEL',
  'VESSEL_DEPARTED',
  'VESSEL_ARRIVED_LAGOS_PORT',
  'CUSTOMS_CLEARED_LAGOS',
  'IN_TRANSIT_TO_LAGOS_OFFICE',
  'READY_FOR_PICKUP',
  'PICKED_UP_COMPLETED',
  'DELIVERED_TO_RECIPIENT',
  'ON_HOLD',
  'CANCELLED',
] as const;

type Tab = 'lookup' | 'cutoff' | 'carrier' | 'status' | 'move';

interface BatchOpsModalProps {
  onClose: () => void;
}

export function BatchOpsModal({ onClose }: BatchOpsModalProps): ReactElement {
  const [tab, setTab] = useState<Tab>('lookup');
  const [batchId, setBatchId] = useState('');
  const [masterTracking, setMasterTracking] = useState('');
  const [activeMaster, setActiveMaster] = useState<string | undefined>(undefined);

  const lookup = useInternalTrackByMasterTracking(activeMaster);
  const approve = useApproveBatchCutoff();
  const carrier = useUpdateBatchCarrierInfo();
  const status = useUpdateBatchStatus();
  const move = useMoveBatchToNext();

  const trimmedBatchId = batchId.trim();

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'lookup', label: 'Internal track' },
    { id: 'cutoff', label: 'Approve cutoff' },
    { id: 'carrier', label: 'Carrier info' },
    { id: 'status', label: 'Update status' },
    { id: 'move', label: 'Move to next' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Batch operations</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[110px] rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  tab === t.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'lookup' ? (
            <div className="space-y-3">
              <Input
                label="Master tracking number"
                placeholder="Internal master id"
                value={masterTracking}
                onChange={(e) => setMasterTracking(e.target.value)}
              />
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveMaster(masterTracking.trim() || undefined)}
                disabled={!masterTracking.trim()}
                className="inline-flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Look up batch
              </Button>
              {activeMaster && (
                <BatchLookupResult
                  isLoading={lookup.isLoading}
                  error={lookup.error}
                  data={lookup.data}
                  onUse={(id) => {
                    setBatchId(id);
                    setTab('cutoff');
                  }}
                />
              )}
            </div>
          ) : (
            <>
              <Input
                label="Batch id"
                placeholder="UUID"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />

              {tab === 'cutoff' && (
                <ApproveCutoffPanel
                  batchId={trimmedBatchId}
                  isPending={approve.isPending}
                  onApprove={() => approve.mutate(trimmedBatchId)}
                />
              )}
              {tab === 'carrier' && (
                <CarrierInfoPanel
                  batchId={trimmedBatchId}
                  isPending={carrier.isPending}
                  onSubmit={(payload) =>
                    carrier.mutate({ batchId: trimmedBatchId, payload })
                  }
                />
              )}
              {tab === 'status' && (
                <StatusPanel
                  batchId={trimmedBatchId}
                  isPending={status.isPending}
                  onSubmit={(statusV2) =>
                    status.mutate({ batchId: trimmedBatchId, payload: { statusV2 } })
                  }
                />
              )}
              {tab === 'move' && (
                <MoveToNextPanel
                  batchId={trimmedBatchId}
                  isPending={move.isPending}
                  onSubmit={(payload) =>
                    move.mutate({ batchId: trimmedBatchId, payload })
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchLookupResult({
  isLoading,
  error,
  data,
  onUse,
}: {
  isLoading: boolean;
  error: Error | null;
  data: { id?: string; status?: string; masterTrackingNumber?: string | null } | undefined;
  onUse: (id: string) => void;
}): ReactElement {
  if (isLoading) {
    return <p className="text-sm text-gray-500">Searching…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error.message}
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm text-gray-500">No batch found.</p>;
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      <p>
        <span className="text-gray-500">Batch id:</span>{' '}
        <span className="font-mono text-gray-800">{data.id ?? '—'}</span>
      </p>
      <p>
        <span className="text-gray-500">Status:</span>{' '}
        <span className="font-semibold text-gray-800">{data.status ?? '—'}</span>
      </p>
      {data.id && (
        <button
          type="button"
          onClick={() => onUse(data.id as string)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Use this id
        </button>
      )}
    </div>
  );
}

function ApproveCutoffPanel({
  batchId,
  isPending,
  onApprove,
}: {
  batchId: string;
  isPending: boolean;
  onApprove: () => void;
}): ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-600">
      <p>
        Superadmin only. Closes the batch and locks members in once cutoff is approved.
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="primary"
          isLoading={isPending}
          disabled={!batchId}
          onClick={onApprove}
        >
          Approve cutoff
        </Button>
      </div>
    </div>
  );
}

function CarrierInfoPanel({
  batchId,
  isPending,
  onSubmit,
}: {
  batchId: string;
  isPending: boolean;
  onSubmit: (payload: DispatchBatchCarrierInfoPayload) => Promise<unknown>;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchCarrierInfoFormData>({
    resolver: zodResolver(batchCarrierInfoSchema),
    defaultValues: {
      carrierName: '',
      airlineTrackingNumber: '',
      oceanTrackingNumber: '',
      d2dTrackingNumber: '',
      voyageOrFlightNumber: '',
      estimatedDepartureAt: '',
      estimatedArrivalAt: '',
      notes: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const payload: DispatchBatchCarrierInfoPayload = {};
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === 'string' && v.trim()) {
            (payload as Record<string, string>)[k] = v.trim();
          }
        }
        await onSubmit(payload);
      })}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Carrier name"
          error={errors.carrierName?.message}
          {...register('carrierName')}
        />
        <Input
          label="Voyage / flight no"
          error={errors.voyageOrFlightNumber?.message}
          {...register('voyageOrFlightNumber')}
        />
        <Input
          label="Airline tracking"
          error={errors.airlineTrackingNumber?.message}
          {...register('airlineTrackingNumber')}
        />
        <Input
          label="Ocean tracking"
          error={errors.oceanTrackingNumber?.message}
          {...register('oceanTrackingNumber')}
        />
        <Input
          label="D2D tracking"
          error={errors.d2dTrackingNumber?.message}
          {...register('d2dTrackingNumber')}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Estimated departure (ISO)"
          placeholder="2026-06-01T08:30:00Z"
          error={errors.estimatedDepartureAt?.message}
          {...register('estimatedDepartureAt')}
        />
        <Input
          label="Estimated arrival (ISO)"
          placeholder="2026-06-10T16:00:00Z"
          error={errors.estimatedArrivalAt?.message}
          {...register('estimatedArrivalAt')}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('notes')}
        />
        {errors.notes?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!batchId}>
          Save carrier info
        </Button>
      </div>
    </form>
  );
}

function StatusPanel({
  batchId,
  isPending,
  onSubmit,
}: {
  batchId: string;
  isPending: boolean;
  onSubmit: (statusV2: string) => Promise<unknown>;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchStatusFormData>({
    resolver: zodResolver(batchStatusSchema),
    defaultValues: { statusV2: STATUS_OPTIONS[0] },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values.statusV2);
      })}
      className="space-y-3"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="statusV2">
          New status
        </label>
        <select
          id="statusV2"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('statusV2')}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.statusV2?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.statusV2.message}</p>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Status cascades to every member order. On departure transitions, staff submissions
        request cutoff approval; superadmins close the batch directly.
      </p>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!batchId}>
          Update status
        </Button>
      </div>
    </form>
  );
}

function MoveToNextPanel({
  batchId,
  isPending,
  onSubmit,
}: {
  batchId: string;
  isPending: boolean;
  onSubmit: (payload: DispatchBatchMoveToNextPayload) => Promise<unknown>;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchMoveToNextFormData>({
    resolver: zodResolver(batchMoveToNextSchema),
    defaultValues: { orderId: '', supplierId: '', packageIdsText: '' },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const payload: DispatchBatchMoveToNextPayload = { orderId: values.orderId };
        const trimmedSupplier =
          typeof values.supplierId === 'string' ? values.supplierId.trim() : '';
        const trimmedPackages =
          typeof values.packageIdsText === 'string' ? values.packageIdsText.trim() : '';
        if (trimmedSupplier) {
          payload.supplierId = trimmedSupplier;
        } else if (trimmedPackages) {
          payload.packageIds = trimmedPackages
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        await onSubmit(payload);
      })}
      className="space-y-3"
    >
      <Input
        label="Order id"
        placeholder="UUID"
        error={errors.orderId?.message}
        {...register('orderId')}
      />
      <Input
        label="Supplier id (move all that supplier's lines)"
        placeholder="UUID — leave blank to use package ids"
        error={errors.supplierId?.message}
        {...register('supplierId')}
      />
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-gray-700"
          htmlFor="packageIdsText"
        >
          Package ids (comma or whitespace separated)
        </label>
        <textarea
          id="packageIdsText"
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('packageIdsText')}
        />
        {errors.packageIdsText?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.packageIdsText.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!batchId}>
          Move to next batch
        </Button>
      </div>
    </form>
  );
}
