import { useState, type ReactElement } from 'react';
import { FileText } from 'lucide-react';
import { FileScanPill } from '@/components/ui';
import {
  useRegDocs,
  useTaskInvoices,
  useUploadRegDoc,
  useUploadTaskInvoice,
  useFileScanStatus,
} from '@/hooks';
import { SAFE_FILE_SCAN_STATUSES } from '@/types';
import type { InvoiceAttachment, InvoiceAttachmentContentType } from '@/types';
import type { OrderInvoice } from '@/pages/shared';
import { cn } from '@/utils';

const ALLOWED_ATTACHMENT_TYPES: InvoiceAttachmentContentType[] = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function isAllowedContentType(value: string): value is InvoiceAttachmentContentType {
  return (ALLOWED_ATTACHMENT_TYPES as string[]).includes(value);
}

const INVOICE_STATUS_STYLE: Record<OrderInvoice['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  finalized: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

/**
 * Task invoice + regulatory document uploads for an order's invoice.
 * `invoice` comes straight off the already-loaded order detail (`view.invoice`,
 * backed by `GET /orders/:id`'s `invoice` field) — no manual UUID entry, since
 * the backend now resolves the 1:1 order↔invoice link for us. `null` means no
 * invoice has been created for this order yet.
 */
export function InvoiceAttachmentsPanel({ invoice }: { invoice: OrderInvoice | null }): ReactElement {
  const invoiceId = invoice?.id;
  const { data: taskInvoices, isLoading: taskInvoicesLoading } = useTaskInvoices(invoiceId);
  const { data: regDocs, isLoading: regDocsLoading } = useRegDocs(invoiceId);
  const uploadTaskInvoice = useUploadTaskInvoice(invoiceId);
  const uploadRegDoc = useUploadRegDoc(invoiceId);

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
        <FileText className="mx-auto h-6 w-6 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-500">No invoice yet for this order</p>
        <p className="mt-1 text-xs text-gray-400">
          Attachments become available once an invoice is created for this order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold capitalize', INVOICE_STATUS_STYLE[invoice.status])}>
          {invoice.status}
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
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
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50',
            isUploading && 'pointer-events-none opacity-50',
          )}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            className="hidden"
            accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
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
          {isLoading ? 'Checking...' : !attachment.publicUrl ? attachment.contentType : 'Not viewable'}
        </span>
      )}
    </li>
  );
}
