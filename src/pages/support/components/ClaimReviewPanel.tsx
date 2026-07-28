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
import { useReviewGalleryClaim, useShopInterestRequest, useUpdateShopInterestRequest } from '@/hooks';
import type { GalleryClaim, GalleryClaimReviewShipment, ShopInterestStatus } from '@/types';
import { ImageTile } from './SupportImageTile';

interface ClaimReviewPanelProps {
  claim: GalleryClaim;
  ticketStatus: string;
}

type ReviewMode = 'idle' | 'approving' | 'rejecting';

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i;
const isImageUrl = (url: string): boolean => IMAGE_EXTS.test(url);

interface CarSaleForm {
  salePriceNgn: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress: string;
  saleNotes: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  location: string;
  exteriorColor: string;
}

const EMPTY_SALE_FORM: CarSaleForm = {
  salePriceNgn: '',
  deliveryMethod: 'pickup',
  deliveryAddress: '',
  saleNotes: '',
  vin: '',
  make: '',
  model: '',
  year: '',
  mileageKm: '',
  fuelType: '',
  transmission: '',
  location: '',
  exteriorColor: '',
};

/* ── Labeled text input for the car-sale form ───────────────────── */

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  full?: boolean;
}): ReactElement {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="mb-1 text-xs font-medium text-gray-600">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
    </div>
  );
}

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

/* ── Sale status — shown after a car-purchase claim is approved, in place
   of the review controls, so staff can track delivery from the same
   ticket instead of a separate admin page ─────────────────────────── */

function saleStatusBadge(status: ShopInterestStatus): { label: string; cls: string } {
  if (status === 'delivered') return { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700' };
  if (status === 'closed') return { label: 'Closed', cls: 'bg-gray-100 text-gray-600' };
  if (status === 'converted') return { label: 'Converted — awaiting delivery', cls: 'bg-blue-100 text-blue-700' };
  return { label: status.replace(/_/g, ' '), cls: 'bg-gray-100 text-gray-600' };
}

function nextSaleStatusOptions(current: ShopInterestStatus): { value: ShopInterestStatus; label: string }[] {
  if (current === 'converted') {
    return [
      { value: 'delivered', label: 'Mark Delivered' },
      { value: 'closed', label: 'Close' },
    ];
  }
  if (current === 'delivered') return [{ value: 'closed', label: 'Close' }];
  return [];
}

function SaleStatusSection({ interestRequestId }: { interestRequestId: string }): ReactElement {
  const { data: interest, isLoading } = useShopInterestRequest(interestRequestId);
  const { mutate: updateInterest, isPending: isUpdating } = useUpdateShopInterestRequest(interestRequestId);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  if (isLoading || !interest) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400">
        Loading sale status…
      </div>
    );
  }

  const badge = saleStatusBadge(interest.status);
  const nextOptions = nextSaleStatusOptions(interest.status);

  const startEditingNotes = (): void => {
    setNotesDraft(interest.staffNotes ?? '');
    setEditingNotes(true);
  };

  const handleSaveNotes = (): void => {
    void updateInterest({ staffNotes: notesDraft.trim() || null })
      .then(() => setEditingNotes(false))
      .catch(() => {
        // error handled by hook's onError
      });
  };

  const handleStatusChange = (status: ShopInterestStatus): void => {
    void updateInterest({ status }).catch(() => {
      // error handled by hook's onError
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">Sale status</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {interest.listing?.trackingNumber && (
          <InfoRow
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Listing tracking"
            value={interest.listing.trackingNumber}
            copyable
          />
        )}
        {interest.deliveryMethod && (
          <InfoRow
            icon={null}
            label="Delivery"
            value={interest.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}
          />
        )}
        {interest.deliveryAddress && (
          <InfoRow icon={null} label="Delivery address" value={interest.deliveryAddress} copyable />
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Staff notes</p>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={2}
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

      {nextOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {nextOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
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
    </div>
  );
}

/* ── Main panel — pending review controls, or (once decided, for a
   car-purchase claim that finalized as a sale) the sale-status view ── */

export function ClaimReviewPanel({ claim, ticketStatus }: ClaimReviewPanelProps): ReactElement {
  const [mode, setMode] = useState<ReviewMode>('idle');
  const [note, setNote] = useState('');
  const [shipmentType, setShipmentType] = useState<'air' | 'ocean' | 'd2d'>('air');
  const [d2dDispatchMode, setD2dDispatchMode] = useState<'air' | 'sea'>('air');
  const [shipmentResult, setShipmentResult] = useState<GalleryClaimReviewShipment | null>(null);
  const [saleForm, setSaleForm] = useState<CarSaleForm>(EMPTY_SALE_FORM);

  const { mutate: reviewClaim, isPending } = useReviewGalleryClaim();

  const isClaimPending = claim.status === 'pending';
  const canReview = ticketStatus !== 'closed';
  const isAnonymous = !claim.claimantUserId;
  const isCarPurchase = claim.claimType === 'car_purchase';
  // Shipment creation is only supported for ownership claims tied to a real
  // account — the backend rejects it for car-purchase claims (they finalize
  // as a Shop sale instead, see below) and for anonymous submitters (nothing
  // to assign it to).
  const canAutoShip = !isCarPurchase && !isAnonymous;
  const saleAddressMissing =
    isCarPurchase && saleForm.deliveryMethod === 'delivery' && !saleForm.deliveryAddress.trim();

  const updateSaleForm = (patch: Partial<CarSaleForm>): void =>
    setSaleForm((f) => ({ ...f, ...patch }));

  const resetForm = (): void => {
    setMode('idle');
    setNote('');
    setSaleForm(EMPTY_SALE_FORM);
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
        ...(isCarPurchase
          ? {
              postApprovalAction: 'create_sale' as const,
              salePriceNgn: saleForm.salePriceNgn.trim() ? Number(saleForm.salePriceNgn) : undefined,
              deliveryMethod: saleForm.deliveryMethod,
              deliveryAddress:
                saleForm.deliveryMethod === 'delivery' ? saleForm.deliveryAddress.trim() : undefined,
              saleNotes: saleForm.saleNotes.trim() || undefined,
              vin: saleForm.vin.trim() || undefined,
              make: saleForm.make.trim() || undefined,
              model: saleForm.model.trim() || undefined,
              year: saleForm.year.trim() ? Number(saleForm.year) : undefined,
              mileageKm: saleForm.mileageKm.trim() ? Number(saleForm.mileageKm) : undefined,
              fuelType: saleForm.fuelType.trim() || undefined,
              transmission: saleForm.transmission.trim() || undefined,
              location: saleForm.location.trim() || undefined,
              exteriorColor: saleForm.exteriorColor.trim() || undefined,
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
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            isClaimPending
              ? 'border-amber-200 bg-amber-100 text-amber-700'
              : claim.status === 'approved'
                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                : 'border-red-200 bg-red-100 text-red-700'
          }`}
        >
          {isClaimPending ? 'Pending review' : claim.status === 'approved' ? 'Approved' : 'Rejected'}
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
          {isClaimPending && isAnonymous && (
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
          {isClaimPending && shipmentResult && (
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

          {/* Sale status — persists after approval so staff can track delivery
              from the same ticket (see SaleStatusSection above) */}
          {!isClaimPending && isCarPurchase && claim.shopInterestRequestId && (
            <SaleStatusSection interestRequestId={claim.shopInterestRequestId} />
          )}

          {/* Approve / Reject buttons */}
          {isClaimPending && canReview && mode === 'idle' && (
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
          {isClaimPending && canReview && mode === 'approving' && (
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
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Approving finalizes this as a sale — creates a Shop listing (marked sold) and
                    an interest request recording the buyer. Managed from Shop's interest-requests
                    view afterward, not Orders/Tracking.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <LabeledInput label="VIN" value={saleForm.vin} onChange={(v) => updateSaleForm({ vin: v })} />
                    <LabeledInput label="Make" value={saleForm.make} onChange={(v) => updateSaleForm({ make: v })} />
                    <LabeledInput label="Model" value={saleForm.model} onChange={(v) => updateSaleForm({ model: v })} />
                    <LabeledInput label="Year" type="number" value={saleForm.year} onChange={(v) => updateSaleForm({ year: v })} />
                    <LabeledInput label="Mileage (km)" type="number" value={saleForm.mileageKm} onChange={(v) => updateSaleForm({ mileageKm: v })} />
                    <LabeledInput label="Fuel type" value={saleForm.fuelType} onChange={(v) => updateSaleForm({ fuelType: v })} />
                    <LabeledInput label="Transmission" value={saleForm.transmission} onChange={(v) => updateSaleForm({ transmission: v })} />
                    <LabeledInput label="Exterior color" value={saleForm.exteriorColor} onChange={(v) => updateSaleForm({ exteriorColor: v })} />
                    <LabeledInput label="Location" value={saleForm.location} onChange={(v) => updateSaleForm({ location: v })} />
                    <LabeledInput
                      label="Sale price (₦, optional)"
                      type="number"
                      placeholder="Defaults to listed price"
                      value={saleForm.salePriceNgn}
                      onChange={(v) => updateSaleForm({ salePriceNgn: v })}
                    />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">Delivery</p>
                    <div className="flex flex-wrap gap-2">
                      {(['pickup', 'delivery'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateSaleForm({ deliveryMethod: m })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                            saleForm.deliveryMethod === m
                              ? 'border-emerald-400 bg-emerald-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {m === 'pickup' ? 'Pickup' : 'Delivery'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {saleForm.deliveryMethod === 'delivery' && (
                    <LabeledInput
                      label="Delivery address"
                      full
                      value={saleForm.deliveryAddress}
                      onChange={(v) => updateSaleForm({ deliveryAddress: v })}
                    />
                  )}

                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-600">Sale notes (optional)</p>
                    <textarea
                      value={saleForm.saleNotes}
                      onChange={(e) => updateSaleForm({ saleNotes: e.target.value })}
                      rows={2}
                      placeholder="Notes specific to this sale…"
                      className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
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
                  disabled={isPending || saleAddressMissing}
                  title={saleAddressMissing ? 'Delivery address is required for delivery' : undefined}
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
          {isClaimPending && canReview && mode === 'rejecting' && (
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

          {/* Ticket closed while claim is still undecided */}
          {isClaimPending && shipmentResult === null && !canReview && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
              Ticket is closed. No further claim actions available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
