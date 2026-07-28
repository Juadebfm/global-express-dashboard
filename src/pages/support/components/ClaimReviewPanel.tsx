import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Hash,
  Mail,
  Package,
  Phone,
  User,
} from 'lucide-react';
import { useReviewGalleryClaim } from '@/hooks';
import type { GalleryClaim, GalleryClaimReviewShipment } from '@/types';
import { ImageTile } from './SupportImageTile';

interface ClaimReviewPanelProps {
  claim: GalleryClaim;
  ticketStatus: string;
}

type ReviewMode = 'idle' | 'approving' | 'rejecting';

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i;
const isImageUrl = (url: string): boolean => IMAGE_EXTS.test(url);

/* ── Copyable info row ──────────────────────────────────────────── */

function InfoRow({
  icon,
  label,
  value,
  copyable = false,
}: {
  icon: ReactElement | null;
  label: string;
  value: string;
  copyable?: boolean;
}): ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="truncate text-xs font-medium text-gray-800">{value}</p>
        </div>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

/* ── Main panel — only rendered when claim is pending ───────────── */

export function ClaimReviewPanel({ claim, ticketStatus }: ClaimReviewPanelProps): ReactElement {
  const [mode, setMode] = useState<ReviewMode>('idle');
  const [note, setNote] = useState('');
  const [shipmentType, setShipmentType] = useState<'air' | 'ocean' | 'd2d'>('air');
  const [d2dDispatchMode, setD2dDispatchMode] = useState<'air' | 'sea'>('air');
  const [shipmentResult, setShipmentResult] = useState<GalleryClaimReviewShipment | null>(null);

  const { mutate: reviewClaim, isPending } = useReviewGalleryClaim();

  const canReview = ticketStatus !== 'closed';
  const isAnonymous = !claim.claimantUserId;
  const isCarPurchase = claim.claimType === 'car_purchase';
  // Shipment creation is only supported for ownership claims tied to a real
  // account — the backend rejects it for car-purchase claims (no order path
  // exists there yet) and for anonymous submitters (nothing to assign it to).
  const canAutoShip = !isCarPurchase && !isAnonymous;

  const resetForm = (): void => {
    setMode('idle');
    setNote('');
  };

  const handleApprove = (): void => {
    void reviewClaim({
      claimId: claim.id,
      payload: {
        decision: 'approve',
        note: note.trim() || undefined,
        ...(canAutoShip
          ? {
              postApprovalAction: 'create_shipment' as const,
              shipmentType,
              ...(shipmentType === 'd2d' ? { d2dDispatchMode } : {}),
            }
          : {}),
      },
    }).then((result) => {
      setShipmentResult(result.shipment);
      resetForm();
    }).catch(() => {
      // error handled by hook's onError
    });
  };

  const handleReject = (): void => {
    void reviewClaim({
      claimId: claim.id,
      payload: { decision: 'reject', note: note.trim() || undefined },
    }).then(() => {
      resetForm();
    }).catch(() => {
      // error handled by hook's onError
    });
  };

  const imageUrls = (claim.proofUrls ?? []).filter(isImageUrl);
  const fileUrls = (claim.proofUrls ?? []).filter((u) => !isImageUrl(u));

  return (
    <div className="shrink-0 border-t border-gray-200 bg-amber-50/40">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-100 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-gray-800">
          {claim.claimType === 'car_purchase' ? 'Car Purchase Claim' : 'Anonymous Goods Claim'}
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          Pending review
        </span>
      </div>

      {/* Scrollable content */}
      <div className="max-h-[40vh] overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Info grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Claimant" value={claim.claimantFullName} copyable />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={claim.claimantEmail} copyable />
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={claim.claimantPhone} copyable />
            <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Tracking" value={claim.itemTrackingNumber} copyable />
            <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Item" value={claim.itemTitle} />
            <InfoRow
              icon={null}
              label="Claim type"
              value={claim.claimType === 'car_purchase' ? 'Car purchase' : 'Ownership'}
            />
          </div>

          {/* Anonymous claimant notice */}
          {isAnonymous && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-amber-800">No platform account</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Automated notification won't be sent on approval/rejection. Follow up via email or phone above.
                </p>
              </div>
            </div>
          )}

          {/* Claimant message */}
          {claim.message && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Message from claimant
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{claim.message}</p>
            </div>
          )}

          {/* Proof images */}
          {imageUrls.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Proof files ({imageUrls.length})
              </p>
              <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {imageUrls.map((url) => (
                  <ImageTile key={url} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Non-image file links */}
          {fileUrls.length > 0 && (
            <div className="space-y-1">
              {fileUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{url.split('/').pop()}</span>
                </a>
              ))}
            </div>
          )}

          {/* Shipment created result (shown after approve + create_shipment) */}
          {shipmentResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">Claim approved · shipment created</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Order tracking"
                  value={shipmentResult.orderTrackingNumber}
                  copyable
                />
                {shipmentResult.dispatchBatchId && (
                  <InfoRow
                    icon={null}
                    label="Dispatch batch"
                    value={shipmentResult.dispatchBatchId}
                    copyable
                  />
                )}
                {shipmentResult.dispatchMasterTrackingNumber && (
                  <InfoRow
                    icon={null}
                    label="Master tracking"
                    value={shipmentResult.dispatchMasterTrackingNumber}
                    copyable
                  />
                )}
              </div>
            </div>
          )}

          {/* Approve / Reject buttons */}
          {canReview && mode === 'idle' && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('approving')}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Approve Claim
              </button>
              <button
                type="button"
                onClick={() => { setMode('rejecting'); setNote(''); }}
                className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Reject Claim
              </button>
            </div>
          )}

          {/* Approve form */}
          {canReview && mode === 'approving' && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Approve claim</p>

              {canAutoShip && (
                <>
                  <p className="text-xs text-gray-600">
                    Approving will create the shipment order and mark this item claimed.
                  </p>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">Shipment type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['air', 'ocean', 'd2d'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setShipmentType(st)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                            shipmentType === st
                              ? 'border-emerald-400 bg-emerald-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {st === 'd2d' ? 'D2D' : st.charAt(0).toUpperCase() + st.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {shipmentType === 'd2d' && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-600">Dispatch mode</p>
                      <div className="flex flex-wrap gap-2">
                        {(['air', 'sea'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setD2dDispatchMode(mode)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                              d2dDispatchMode === mode
                                ? 'border-emerald-400 bg-emerald-600 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isCarPurchase && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Order creation for car purchases isn't available yet — approving will mark this
                  car as sold. Arrange delivery/pickup separately for now.
                </p>
              )}

              {!isCarPurchase && isAnonymous && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  No platform account linked — approving will mark this item claimed, but a
                  shipment can't be auto-created without an account. Follow up with the claimant
                  directly.
                </p>
              )}

              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Note (optional)</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note for the claimant…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleApprove}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? 'Approving…' : 'Confirm Approval'}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={resetForm}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reject form */}
          {canReview && mode === 'rejecting' && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Reject claim</p>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Reason (optional)</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Explain why the claim is being rejected…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleReject}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={resetForm}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rejection result notice (removed via invalidation — component unmounts after review) */}
          {shipmentResult === null && !canReview && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
              Ticket is closed. No further claim actions available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
