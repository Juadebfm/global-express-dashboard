import { useMemo, useState, type ReactElement } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, FileText, FileUp, Plus, Ruler, X } from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button, FileScanPill, Input } from '@/components/ui';
import { useFileScanStatus } from '@/hooks';
import { SAFE_FILE_SCAN_STATUSES } from '@/types';
import { ROUTES } from '@/constants';
import {
  useDashboardData,
  useRecordShipmentMeasurement,
  useRegDocs,
  useShipmentMeasurements,
  useTaskInvoices,
  useUploadRegDoc,
  useUploadTaskInvoice,
} from '@/hooks';
import {
  shipmentMeasurementSchema,
  type ShipmentMeasurementFormData,
} from '@/components/forms';
import type {
  InvoiceAttachment,
  InvoiceAttachmentContentType,
  ShipmentMeasurement,
  ShipmentMeasurementPayload,
} from '@/types';

const checkpointLabels: Record<string, string> = {
  SK_WAREHOUSE: 'South Korea warehouse',
  AIRPORT: 'Airport',
  NIGERIA_OFFICE: 'Nigeria office',
};

const allowedAttachmentTypes: InvoiceAttachmentContentType[] = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function isAllowedContentType(value: string): value is InvoiceAttachmentContentType {
  return (allowedAttachmentTypes as string[]).includes(value);
}

export function ShipmentDetailPage(): ReactElement {
  const { id: shipmentId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } =
    useDashboardData();

  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [invoiceIdDraft, setInvoiceIdDraft] = useState<string>(
    searchParams.get('invoiceId') ?? '',
  );

  const activeInvoiceId = searchParams.get('invoiceId') ?? '';

  const { data: measurements, isLoading: measurementsLoading } =
    useShipmentMeasurements(shipmentId);
  const recordMeasurement = useRecordShipmentMeasurement(shipmentId);

  const { data: taskInvoices, isLoading: taskInvoicesLoading } =
    useTaskInvoices(activeInvoiceId || undefined);
  const { data: regDocs, isLoading: regDocsLoading } = useRegDocs(
    activeInvoiceId || undefined,
  );
  const uploadTaskInvoice = useUploadTaskInvoice(activeInvoiceId || undefined);
  const uploadRegDoc = useUploadRegDoc(activeInvoiceId || undefined);

  const measurementRows = useMemo(() => measurements ?? [], [measurements]);

  return (
    <AppShell
      data={dashboard}
      isLoading={dashboardLoading}
      error={dashboardError}
      loadingLabel="Loading shipment..."
    >
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate(ROUTES.SHIPMENTS)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shipments
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Shipment detail</h1>
          <p className="mt-1 break-all text-sm text-gray-500">
            ID: <span className="font-mono text-gray-700">{shipmentId}</span>
          </p>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Measurements</h2>
                <p className="text-sm text-gray-500">
                  Per-checkpoint weight and CBM recorded by staff.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowMeasurementModal(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Record measurement
            </Button>
          </div>

          <MeasurementsList isLoading={measurementsLoading} rows={measurementRows} />
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invoice attachments</h2>
              <p className="text-sm text-gray-500">
                Task invoices and regulatory docs live against the parent invoice id.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="grow">
              <Input
                label="Invoice id"
                placeholder="UUID"
                value={invoiceIdDraft}
                onChange={(e) => setInvoiceIdDraft(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const trimmed = invoiceIdDraft.trim();
                if (trimmed) {
                  setSearchParams({ invoiceId: trimmed });
                } else {
                  setSearchParams({});
                }
              }}
            >
              Load attachments
            </Button>
          </div>

          {activeInvoiceId ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <AttachmentPanel
                title="Task invoices"
                rows={taskInvoices ?? []}
                isLoading={taskInvoicesLoading}
                isUploading={uploadTaskInvoice.isPending}
                onUpload={(file) =>
                  uploadTaskInvoice.mutate({
                    file,
                    presign: {
                      contentType: file.type as InvoiceAttachmentContentType,
                      fileSizeBytes: file.size,
                      originalFileName: file.name,
                    },
                    confirm: {
                      contentType: file.type as InvoiceAttachmentContentType,
                      fileSizeBytes: file.size,
                      originalFileName: file.name,
                    },
                  })
                }
              />
              <AttachmentPanel
                title="Regulatory documents"
                rows={regDocs ?? []}
                isLoading={regDocsLoading}
                isUploading={uploadRegDoc.isPending}
                onUpload={(file) =>
                  uploadRegDoc.mutate({
                    file,
                    presign: {
                      contentType: file.type as InvoiceAttachmentContentType,
                      fileSizeBytes: file.size,
                      originalFileName: file.name,
                    },
                    confirm: {
                      contentType: file.type as InvoiceAttachmentContentType,
                      fileSizeBytes: file.size,
                      originalFileName: file.name,
                    },
                  })
                }
              />
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Enter an invoice id above to load and upload its attachments.
            </p>
          )}
        </section>
      </div>

      {showMeasurementModal && (
        <MeasurementModal
          isPending={recordMeasurement.isPending}
          onClose={() => setShowMeasurementModal(false)}
          onSubmit={async (payload) => {
            await recordMeasurement.mutate(payload);
            setShowMeasurementModal(false);
          }}
        />
      )}
    </AppShell>
  );
}

interface MeasurementsListProps {
  isLoading: boolean;
  rows: ShipmentMeasurement[];
}

function MeasurementsList({ isLoading, rows }: MeasurementsListProps): ReactElement {
  if (isLoading) {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Loading measurements...
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        No measurements yet. Record the first checkpoint to begin tracking weight and CBM.
      </div>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
      <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Checkpoint</th>
            <th className="px-4 py-3">Weight (kg)</th>
            <th className="px-4 py-3">CBM</th>
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3">Recorded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium text-gray-700">
                {checkpointLabels[m.checkpoint] ?? m.checkpoint}
              </td>
              <td className="px-4 py-3 text-gray-700">{m.measuredWeightKg}</td>
              <td className="px-4 py-3 text-gray-700">{m.measuredCbm}</td>
              <td className="px-4 py-3 text-gray-600">{m.notes ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

interface AttachmentPanelProps {
  title: string;
  rows: InvoiceAttachment[];
  isLoading: boolean;
  isUploading: boolean;
  onUpload: (file: File) => Promise<unknown> | void;
}

function AttachmentPanel({
  title,
  rows,
  isLoading,
  isUploading,
  onUpload,
}: AttachmentPanelProps): ReactElement {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 ${
            isUploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <FileUp className="h-3.5 w-3.5" />
          {isUploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            className="hidden"
            accept={allowedAttachmentTypes.join(',')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (!isAllowedContentType(file.type)) {
                setError('Only PDF or image files are accepted.');
                return;
              }
              setError(null);
              void onUpload(file);
            }}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-3">
        {isLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <AttachmentRow key={r.id} attachment={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface MeasurementModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: ShipmentMeasurementPayload) => Promise<void>;
}

function MeasurementModal({
  isPending,
  onClose,
  onSubmit,
}: MeasurementModalProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShipmentMeasurementFormData>({
    resolver: zodResolver(shipmentMeasurementSchema),
    defaultValues: {
      checkpoint: 'SK_WAREHOUSE',
      measuredWeightKg: '',
      measuredCbm: '',
      notes: '',
    },
  });

  return (
    <Modal title="Record measurement" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          const trimmedNotes = typeof values.notes === 'string' ? values.notes.trim() : '';
          const payload: ShipmentMeasurementPayload = {
            checkpoint: values.checkpoint,
            measuredWeightKg: Number(values.measuredWeightKg),
            measuredCbm: Number(values.measuredCbm),
          };
          if (trimmedNotes.length > 0) {
            payload.notes = trimmedNotes;
          }
          await onSubmit(payload);
        })}
        className="space-y-4"
      >
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="checkpoint"
          >
            Checkpoint
          </label>
          <select
            id="checkpoint"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('checkpoint')}
          >
            <option value="SK_WAREHOUSE">South Korea warehouse</option>
            <option value="AIRPORT">Airport</option>
            <option value="NIGERIA_OFFICE">Nigeria office</option>
          </select>
          {errors.checkpoint?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.checkpoint.message}</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Measured weight (kg)"
            type="number"
            step="0.01"
            error={errors.measuredWeightKg?.message}
            {...register('measuredWeightKg')}
          />
          <Input
            label="Measured CBM"
            type="number"
            step="0.001"
            error={errors.measuredCbm?.message}
            {...register('measuredCbm')}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Any anomalies, damage, or remeasurement context."
            {...register('notes')}
          />
          {errors.notes?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Save measurement
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}


interface AttachmentRowProps {
  attachment: InvoiceAttachment;
}

/**
 * Renders one task-invoice / regulatory-doc row with a scan-status pill +
 * a "View" link that only activates when the BE confirms the file is safe.
 * Pending → disabled link with spinner; malicious / error → disabled link
 * with a red pill explaining why.
 */
function AttachmentRow({ attachment }: AttachmentRowProps): ReactElement {
  const { data, isLoading } = useFileScanStatus(attachment.r2Key);
  const status = data?.status;
  const isSafe = status !== undefined && SAFE_FILE_SCAN_STATUSES.includes(status);

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-medium" title={attachment.originalFileName}>
          {attachment.originalFileName}
        </span>
        {status && <FileScanPill status={status} compact />}
      </div>
      {attachment.publicUrl && isSafe ? (
        <a
          className="text-brand-600 hover:underline"
          href={attachment.publicUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          View
        </a>
      ) : (
        <span className="text-gray-400">
          {isLoading ? "Checking..." : !attachment.publicUrl ? attachment.contentType : "Not viewable"}
        </span>
      )}
    </li>
  );
}
