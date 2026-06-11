import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Search, Wind, Waves, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { listDispatchBatches } from '@/services/shipmentsService';
import type {
  DispatchBatchListItem,
  DispatchBatchCarrierInfoPayload,
  DispatchBatchMoveToNextPayload,
} from '@/types';
import { cn } from '@/utils';

const TOKEN_KEY = 'globalxpress_token';

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

type Tab = 'cutoff' | 'carrier' | 'status' | 'move' | 'lookup';
type ModeFilter = 'all' | 'air' | 'sea';

// ── Batch picker ──────────────────────────────────────────────────────────────

function formatBatch(b: DispatchBatchListItem): string {
  const mode = b.transportMode === 'air' ? 'Air' : 'Sea';
  return `${b.masterTrackingNumber} — ${mode} — ${b.shipmentCount} shipment${b.shipmentCount === 1 ? '' : 's'}`;
}

function statusBadgeClass(status: DispatchBatchListItem['status']): string {
  if (status === 'open') return 'bg-emerald-50 text-emerald-700';
  if (status === 'cutoff_pending_approval') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-500';
}

function statusLabel(status: DispatchBatchListItem['status']): string {
  if (status === 'open') return 'Open';
  if (status === 'cutoff_pending_approval') return 'Cutoff pending';
  return 'Closed';
}

interface BatchPickerProps {
  selectedId: string;
  onSelect: (batch: DispatchBatchListItem) => void;
}

function BatchPicker({ selectedId, onSelect }: BatchPickerProps): ReactElement {
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', 'batches', 'open'],
    queryFn: () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');
      return listDispatchBatches(token, { status: 'open', limit: 50 });
    },
    staleTime: 30_000,
  });

  const batches = data?.data ?? [];
  const filtered =
    modeFilter === 'all' ? batches : batches.filter((b) => b.transportMode === modeFilter);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-800">Active batch</p>
        <div className="ml-auto flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
          {(['all', 'air', 'sea'] as ModeFilter[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition',
                modeFilter === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {m === 'air' && <Wind className="h-3 w-3" />}
              {m === 'sea' && <Waves className="h-3 w-3" />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {isLoading && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">Loading batches…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No open batches{modeFilter !== 'all' ? ` for ${modeFilter}` : ''}.
          </p>
        )}
        {filtered.map((batch) => (
          <button
            key={batch.id}
            type="button"
            onClick={() => onSelect(batch)}
            className={cn(
              'flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-0 hover:bg-gray-50',
              selectedId === batch.id && 'bg-brand-50 hover:bg-brand-50',
            )}
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-gray-900">
                {batch.masterTrackingNumber}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {batch.transportMode === 'air' ? '✈ Air' : '🚢 Sea'} · {batch.shipmentCount} shipment{batch.shipmentCount === 1 ? '' : 's'}
                {batch.carrierName ? ` · ${batch.carrierName}` : ''}
              </p>
            </div>
            <span className={cn('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', statusBadgeClass(batch.status))}>
              {statusLabel(batch.status)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Selected batch header ─────────────────────────────────────────────────────

function SelectedBatchBar({
  batch,
  onClear,
}: {
  batch: DispatchBatchListItem;
  onClear: () => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5">
      <Layers className="h-4 w-4 shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-semibold text-brand-800">{formatBatch(batch)}</p>
        <p className="text-[10px] text-brand-500">{batch.id}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 text-brand-400 hover:text-brand-700"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface BatchOpsModalProps {
  onClose: () => void;
}

export function BatchOpsModal({ onClose }: BatchOpsModalProps): ReactElement {
  const [tab, setTab] = useState<Tab>('cutoff');
  const [selectedBatch, setSelectedBatch] = useState<DispatchBatchListItem | null>(null);
  const [masterTracking, setMasterTracking] = useState('');
  const [activeMaster, setActiveMaster] = useState<string | undefined>(undefined);

  const lookup = useInternalTrackByMasterTracking(activeMaster);
  const approve = useApproveBatchCutoff();
  const carrier = useUpdateBatchCarrierInfo();
  const status = useUpdateBatchStatus();
  const move = useMoveBatchToNext();

  const batchId = selectedBatch?.id ?? '';

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'cutoff', label: 'Approve cutoff' },
    { id: 'carrier', label: 'Carrier info' },
    { id: 'status', label: 'Update status' },
    { id: 'move', label: 'Move to next' },
    { id: 'lookup', label: 'Internal track' },
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

        <div className="space-y-4 px-6 py-5">
          {/* Batch picker — always visible */}
          {selectedBatch ? (
            <SelectedBatchBar batch={selectedBatch} onClear={() => setSelectedBatch(null)} />
          ) : (
            <BatchPicker selectedId={batchId} onSelect={setSelectedBatch} />
          )}

          {/* Operation tabs */}
          <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'min-w-[100px] flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!selectedBatch && tab !== 'lookup' && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              Select a batch above to continue.
            </p>
          )}

          {tab === 'lookup' && (
            <div className="space-y-3">
              <Input
                label="Master tracking number"
                placeholder="GEX-BATCH-…"
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
                  onUse={(id, mtn) => {
                    // Minimal synthetic list item so SelectedBatchBar can render
                    setSelectedBatch({
                      id,
                      masterTrackingNumber: mtn ?? id,
                      transportMode: 'air',
                      status: 'open',
                      shipmentCount: 0,
                      carrierName: null,
                      voyageOrFlightNumber: null,
                      estimatedDepartureAt: null,
                      createdAt: '',
                    });
                    setTab('cutoff');
                  }}
                />
              )}
            </div>
          )}

          {tab === 'cutoff' && selectedBatch && (
            <ApproveCutoffPanel
              batchId={batchId}
              isPending={approve.isPending}
              onApprove={() => approve.mutate(batchId)}
            />
          )}
          {tab === 'carrier' && selectedBatch && (
            <CarrierInfoPanel
              batchId={batchId}
              isPending={carrier.isPending}
              onSubmit={(payload) => carrier.mutate({ batchId, payload })}
            />
          )}
          {tab === 'status' && selectedBatch && (
            <StatusPanel
              batchId={batchId}
              isPending={status.isPending}
              onSubmit={(statusV2) => status.mutate({ batchId, payload: { statusV2 } })}
            />
          )}
          {tab === 'move' && selectedBatch && (
            <MoveToNextPanel
              batchId={batchId}
              isPending={move.isPending}
              onSubmit={(payload) => move.mutate({ batchId, payload })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function BatchLookupResult({
  isLoading,
  error,
  data,
  onUse,
}: {
  isLoading: boolean;
  error: Error | null;
  data: { id?: string; status?: string; masterTrackingNumber?: string | null } | undefined;
  onUse: (id: string, mtn?: string | null) => void;
}): ReactElement {
  if (isLoading) return <p className="text-sm text-gray-500">Searching…</p>;
  if (error) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>
    );
  }
  if (!data) return <p className="text-sm text-gray-500">No batch found.</p>;
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
          onClick={() => onUse(data.id as string, data.masterTrackingNumber)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Use this batch
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
      <p>Superadmin only. Closes the batch and locks members in once cutoff is approved.</p>
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
        <Input label="Carrier name" error={errors.carrierName?.message} {...register('carrierName')} />
        <Input label="Voyage / flight no" error={errors.voyageOrFlightNumber?.message} {...register('voyageOrFlightNumber')} />
        <Input label="Airline tracking" error={errors.airlineTrackingNumber?.message} {...register('airlineTrackingNumber')} />
        <Input label="Ocean tracking" error={errors.oceanTrackingNumber?.message} {...register('oceanTrackingNumber')} />
        <Input label="D2D tracking" error={errors.d2dTrackingNumber?.message} {...register('d2dTrackingNumber')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Est. departure</label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('estimatedDepartureAt')}
          />
          {errors.estimatedDepartureAt?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.estimatedDepartureAt.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Est. arrival</label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('estimatedArrivalAt')}
          />
          {errors.estimatedArrivalAt?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.estimatedArrivalAt.message}</p>
          )}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('notes')}
        />
        {errors.notes?.message && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
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
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values.statusV2); })} className="space-y-3">
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
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.statusV2?.message && <p className="mt-1 text-sm text-red-600">{errors.statusV2.message}</p>}
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
        const trimmedSupplier = typeof values.supplierId === 'string' ? values.supplierId.trim() : '';
        const trimmedPackages = typeof values.packageIdsText === 'string' ? values.packageIdsText.trim() : '';
        if (trimmedSupplier) {
          payload.supplierId = trimmedSupplier;
        } else if (trimmedPackages) {
          payload.packageIds = trimmedPackages.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
        }
        await onSubmit(payload);
      })}
      className="space-y-3"
    >
      <Input label="Order id" placeholder="UUID" error={errors.orderId?.message} {...register('orderId')} />
      <Input
        label="Supplier id (move all that supplier's lines)"
        placeholder="UUID — leave blank to use package ids"
        error={errors.supplierId?.message}
        {...register('supplierId')}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="packageIdsText">
          Package ids (comma or whitespace separated)
        </label>
        <textarea
          id="packageIdsText"
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('packageIdsText')}
        />
        {errors.packageIdsText?.message && <p className="mt-1 text-sm text-red-600">{errors.packageIdsText.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={isPending} disabled={!batchId}>
          Move to next batch
        </Button>
      </div>
    </form>
  );
}
