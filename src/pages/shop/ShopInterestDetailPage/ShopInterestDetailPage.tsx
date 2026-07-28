import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2 } from 'lucide-react';
import { useShopInterestRequest, useUpdateShopInterestRequest } from '@/hooks';
import { AppShell, PageHeader, nextShopInterestStatusOptions, shopInterestStatusBadge } from '@/pages/shared';
import { formatDate } from '@/utils';
import type { ShopInterestStatus } from '@/types';

/**
 * Deep-link only — reached from an "admin_alert" notification's View button,
 * never from the sidebar. Reuses the same GET/PATCH /shop/interests/:id
 * endpoints and status vocabulary as ClaimReviewPanel's SaleStatusSection,
 * generalized here since a general inquiry can start anywhere in the funnel
 * (new/contacted/qualified/...), not just at 'converted'.
 */

function InfoRow({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }): ReactElement {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-sm font-medium text-gray-800">{value}</p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

export function ShopInterestDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: interest, isLoading, error } = useShopInterestRequest(id);
  const { mutate: updateInterest, isPending: isUpdating } = useUpdateShopInterestRequest(id ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const handleStatusChange = (status: ShopInterestStatus): void => {
    void updateInterest({ status }).catch(() => {
      // error handled by hook's onError
    });
  };

  const startEditingNotes = (): void => {
    setNotesDraft(interest?.staffNotes ?? '');
    setEditingNotes(true);
  };

  const handleSaveNotes = (): void => {
    void updateInterest({ staffNotes: notesDraft.trim() || null })
      .then(() => setEditingNotes(false))
      .catch(() => {
        // error handled by hook's onError
      });
  };

  return (
    <AppShell data={null} isLoading={false} error={null} requireData={false}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      )}

      {!isLoading && (error || !interest) && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error?.message ?? 'Interest request not found.'}
        </div>
      )}

      {!isLoading && interest && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PageHeader
              title={interest.listing?.title ?? 'Shop interest request'}
              subtitle={interest.listing?.trackingNumber}
            />
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${shopInterestStatusBadge(interest.status).cls}`}
            >
              {shopInterestStatusBadge(interest.status).label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow label="Requester" value={interest.fullName} copyable />
            {interest.email && <InfoRow label="Email" value={interest.email} copyable />}
            {interest.phone && <InfoRow label="Phone" value={interest.phone} copyable />}
            <InfoRow label="Source" value={interest.source} />
            {interest.deliveryMethod && (
              <InfoRow label="Delivery" value={interest.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'} />
            )}
            {interest.deliveryAddress && (
              <InfoRow label="Delivery address" value={interest.deliveryAddress} copyable />
            )}
          </div>

          {interest.message && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Message</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{interest.message}</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">Staff notes</p>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a note…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleSaveNotes}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => setEditingNotes(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditingNotes}
                className="w-full rounded-lg border border-dashed border-gray-200 px-3 py-2 text-left text-sm text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                {interest.staffNotes || <span className="text-gray-400">Add a note…</span>}
              </button>
            )}
          </div>

          {nextShopInterestStatusOptions(interest.status).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextShopInterestStatusOptions(interest.status).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                    opt.value === 'closed'
                      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 sm:grid-cols-4">
            {interest.contactedAt && <p>Contacted {formatDate(interest.contactedAt)}</p>}
            {interest.qualifiedAt && <p>Qualified {formatDate(interest.qualifiedAt)}</p>}
            {interest.convertedAt && <p>Converted {formatDate(interest.convertedAt)}</p>}
            {interest.deliveredAt && <p>Delivered {formatDate(interest.deliveredAt)}</p>}
            {interest.closedAt && <p>Closed {formatDate(interest.closedAt)}</p>}
          </div>
        </div>
      )}
    </AppShell>
  );
}
