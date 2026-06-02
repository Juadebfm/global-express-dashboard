import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ImageIcon,
  Plus,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button, FileScanPill, Input } from '@/components/ui';
import { useFileScanStatus } from '@/hooks';
import { SAFE_FILE_SCAN_STATUSES } from '@/types';
import { useDashboardData } from '@/hooks';
import {
  useAuthedGallery,
  useCreateGalleryAdvert,
  useCreateGalleryItem,
  useGalleryClaims,
  useReviewGalleryClaim,
  useUpdateGalleryAdvert,
  useUpdateGalleryItem,
  useUploadGalleryItemMedia,
} from '@/hooks';
import {
  galleryClaimReviewSchema,
  galleryItemSchema,
  type GalleryClaimReviewFormData,
  type GalleryItemFormData,
} from '@/components/forms';
import type {
  GalleryClaim,
  GalleryClaimReviewPayload,
  GalleryClaimsQuery,
  GalleryItem,
  GalleryItemCreatePayload,
  GalleryUploadContentType,
} from '@/types';

const ALLOWED_MEDIA_TYPES: GalleryUploadContentType[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function isAllowedMediaType(value: string): value is GalleryUploadContentType {
  return (ALLOWED_MEDIA_TYPES as string[]).includes(value);
}

type Tab = 'items' | 'claims';

export default function AdminGalleryPage(): ReactElement {
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } =
    useDashboardData();
  const [tab, setTab] = useState<Tab>('items');

  return (
    <AppShell
      data={dashboard}
      isLoading={dashboardLoading}
      error={dashboardError}
      loadingLabel="Loading gallery..."
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Gallery management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Curate the public gallery and review incoming ownership claims and car purchase
            attempts.
          </p>
          <div className="mt-4 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1">
            <TabButton active={tab === 'items'} onClick={() => setTab('items')}>
              Items & adverts
            </TabButton>
            <TabButton active={tab === 'claims'} onClick={() => setTab('claims')}>
              Claim review queue
            </TabButton>
          </div>
        </div>

        {tab === 'items' ? <ItemsTab /> : <ClaimsTab />}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

// ── Items / adverts tab ──────────────────────────────────────────────────────

function ItemsTab(): ReactElement {
  const { data, isLoading, error } = useAuthedGallery();
  const [editTarget, setEditTarget] = useState<GalleryItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Loading gallery items...
      </p>
    );
  }
  if (error) {
    return (
      <p className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
        {error.message}
      </p>
    );
  }
  if (!data) return <></>;

  const allItems = [
    ...data.anonymousGoods,
    ...data.cars,
    ...data.sales,
    ...data.adverts,
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New item
        </Button>
      </div>

      {allItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
          No gallery items yet. Create one to publish on the marketing site.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {allItems.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {item.previewImageUrl ? (
                  <img
                    src={item.previewImageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {item.itemType.replace('_', ' ')} · {item.status}
                </p>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditTarget(item)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && <CreateItemModal onClose={() => setShowCreate(false)} />}
      {editTarget && (
        <EditItemModal item={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}

// ── Create item modal (covers both items + adverts) ──────────────────────────

interface CreateItemModalProps {
  onClose: () => void;
}

function CreateItemModal({ onClose }: CreateItemModalProps): ReactElement {
  const createItem = useCreateGalleryItem();
  const createAdvert = useCreateGalleryAdvert();
  const uploadMedia = useUploadGalleryItemMedia();

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GalleryItemFormData>({
    resolver: zodResolver(galleryItemSchema),
    defaultValues: {
      itemType: 'advert',
      title: '',
      description: '',
      previewImageUrl: '',
      ctaUrl: '',
      startsAt: '',
      endsAt: '',
      isPublished: false,
      carPriceNgn: '',
    },
  });

  const itemType = watch('itemType');

  const isPending = createItem.isPending || createAdvert.isPending || uploading;

  return (
    <Modal title="Create gallery item" onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            const trimmedString = (v: string | undefined): string | undefined => {
              const t = (v ?? '').trim();
              return t.length > 0 ? t : undefined;
            };
            if (itemType === 'advert') {
              await createAdvert.mutate({
                title: values.title,
                description: trimmedString(values.description),
                previewImageUrl: previewUrl || trimmedString(values.previewImageUrl),
                ctaUrl: trimmedString(values.ctaUrl),
                startsAt: trimmedString(values.startsAt),
                endsAt: trimmedString(values.endsAt),
                isPublished: values.isPublished,
              });
            } else {
              const payload: GalleryItemCreatePayload = {
                itemType: values.itemType,
                title: values.title,
                description: trimmedString(values.description),
                previewImageUrl: previewUrl || trimmedString(values.previewImageUrl),
                ctaUrl: trimmedString(values.ctaUrl),
                startsAt: trimmedString(values.startsAt),
                endsAt: trimmedString(values.endsAt),
                isPublished: values.isPublished,
              };
              if (values.itemType === 'car') {
                payload.carPriceNgn = Number(values.carPriceNgn);
              }
              await createItem.mutate(payload);
            }
            onClose();
          } catch {
            /* feedback in hooks */
          }
        })}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="itemType">
            Item type
          </label>
          <select
            id="itemType"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('itemType')}
          >
            <option value="advert">Advert</option>
            <option value="anonymous_goods">Anonymous goods</option>
            <option value="car">Car</option>
          </select>
        </div>

        <Input label="Title" error={errors.title?.message} {...register('title')} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="itemDescription">
            Description
          </label>
          <textarea
            id="itemDescription"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('description')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Preview image</label>
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Choose image'}
              <input
                type="file"
                className="hidden"
                accept={ALLOWED_MEDIA_TYPES.join(',')}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (!isAllowedMediaType(file.type)) return;
                  setUploading(true);
                  try {
                    const result = await uploadMedia.mutate({
                      file,
                      contentType: file.type,
                      originalFileName: file.name,
                    });
                    const url = result.publicUrl || '';
                    setPreviewUrl(url);
                    setValue('previewImageUrl', url, { shouldDirty: true });
                  } catch {
                    /* feedback handled in hook */
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {(previewUrl || watch('previewImageUrl')) && (
              <p className="mt-2 truncate text-xs text-gray-500">
                {previewUrl || watch('previewImageUrl')}
              </p>
            )}
          </div>
        </div>

        <Input
          label="CTA URL (optional)"
          error={errors.ctaUrl?.message}
          {...register('ctaUrl')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Starts at (ISO, optional)"
            placeholder="2026-06-01T00:00:00Z"
            error={errors.startsAt?.message}
            {...register('startsAt')}
          />
          <Input
            label="Ends at (ISO, optional)"
            placeholder="2026-06-30T00:00:00Z"
            error={errors.endsAt?.message}
            {...register('endsAt')}
          />
        </div>

        {itemType === 'car' && (
          <Input
            label="Car price (NGN)"
            type="number"
            step="1000"
            min="0"
            error={errors.carPriceNgn?.message}
            {...register('carPriceNgn')}
          />
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4" {...register('isPublished')} />
          Publish immediately
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit modal (reuses same schema; only title + publish state are editable here) ─

interface EditItemModalProps {
  item: GalleryItem;
  onClose: () => void;
}

function EditItemModal({ item, onClose }: EditItemModalProps): ReactElement {
  const updateItem = useUpdateGalleryItem();
  const updateAdvert = useUpdateGalleryAdvert();
  const isAdvert = item.itemType === 'advert';

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [isPublished, setIsPublished] = useState(item.isPublished);

  const isPending = isAdvert ? updateAdvert.isPending : updateItem.isPending;

  return (
    <Modal title="Edit item" onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const payload = {
              title: title.trim() || undefined,
              description: description.trim() || undefined,
              isPublished,
            };
            if (isAdvert) {
              await updateAdvert.mutate({ itemId: item.id, payload });
            } else {
              await updateItem.mutate({ itemId: item.id, payload });
            }
            onClose();
          } catch {
            /* feedback */
          }
        }}
        className="space-y-3"
      >
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Claims review tab ────────────────────────────────────────────────────────

function ClaimsTab(): ReactElement {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending',
  );
  const query: GalleryClaimsQuery = useMemo(
    () => (statusFilter === 'all' ? {} : { status: statusFilter }),
    [statusFilter],
  );
  const { data, isLoading, error } = useGalleryClaims(query);
  const [reviewTarget, setReviewTarget] = useState<GalleryClaim | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === s
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Loading claims...
        </p>
      )}
      {error && (
        <p className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          {error.message}
        </p>
      )}

      {data && data.length === 0 && !isLoading && (
        <p className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
          No claims match the current filter.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((claim) => (
            <li
              key={claim.id}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {claim.claimType.replace('_', ' ')} ·{' '}
                    <StatusBadge status={claim.status} />
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {claim.itemTitle}
                  </p>
                  <p className="text-xs font-mono text-gray-500">
                    {claim.itemTrackingNumber}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    {claim.claimantFullName} · {claim.claimantEmail} ·{' '}
                    {claim.claimantPhone}
                  </p>
                  {claim.message && (
                    <p className="mt-2 text-sm text-gray-600">{claim.message}</p>
                  )}
                  {claim.proofUrls && claim.proofUrls.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {claim.proofUrls.map((u, idx) => (
                        <ClaimProofLink key={u} url={u} index={idx} />
                      ))}
                    </ul>
                  )}
                </div>
                {claim.status === 'pending' && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setReviewTarget(claim)}
                  >
                    Review
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewTarget && (
        <ReviewClaimModal
          claim={reviewTarget}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: GalleryClaim['status'] }): ReactElement {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
      <ShieldCheck className="h-3 w-3" /> Pending
    </span>
  );
}

interface ReviewClaimModalProps {
  claim: GalleryClaim;
  onClose: () => void;
}

function ReviewClaimModal({ claim, onClose }: ReviewClaimModalProps): ReactElement {
  const review = useReviewGalleryClaim();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GalleryClaimReviewFormData>({
    resolver: zodResolver(galleryClaimReviewSchema),
    defaultValues: {
      decision: 'approve',
      note: '',
      postApprovalAction: 'approve_only',
      shipmentType: undefined,
      d2dDispatchMode: undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch is safe here
  const decision = watch('decision');
  const postAction = watch('postApprovalAction');
  const shipmentType = watch('shipmentType');

  return (
    <Modal title="Review claim" onClose={onClose}>
      <p className="mb-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {claim.itemTitle} ·{' '}
        <span className="font-mono text-xs">{claim.itemTrackingNumber}</span>
        <br />
        Submitted by {claim.claimantFullName} · {claim.claimantEmail}
      </p>
      <form
        onSubmit={handleSubmit(async (values) => {
          const payload: GalleryClaimReviewPayload = { decision: values.decision };
          if (values.note?.trim()) payload.note = values.note.trim();
          if (values.decision === 'approve') {
            if (values.postApprovalAction) payload.postApprovalAction = values.postApprovalAction;
            if (values.shipmentType) payload.shipmentType = values.shipmentType;
            if (values.d2dDispatchMode) payload.d2dDispatchMode = values.d2dDispatchMode;
          }
          try {
            await review.mutate({ claimId: claim.id, payload });
            onClose();
          } catch {
            /* feedback handled in hook */
          }
        })}
        className="space-y-3"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="decision">
            Decision
          </label>
          <select
            id="decision"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('decision')}
          >
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="reviewNote">
            Note (optional)
          </label>
          <textarea
            id="reviewNote"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('note')}
          />
        </div>

        {decision === 'approve' && claim.claimType === 'ownership' && (
          <>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-gray-700"
                htmlFor="postApprovalAction"
              >
                Post-approval action
              </label>
              <select
                id="postApprovalAction"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('postApprovalAction')}
              >
                <option value="approve_only">Approve only</option>
                <option value="create_shipment">Approve and create shipment</option>
              </select>
            </div>

            {postAction === 'create_shipment' && (
              <>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                    htmlFor="shipmentType"
                  >
                    Shipment type
                  </label>
                  <select
                    id="shipmentType"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    {...register('shipmentType')}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose a shipment type
                    </option>
                    <option value="air">Air</option>
                    <option value="ocean">Ocean</option>
                    <option value="d2d">D2D</option>
                  </select>
                  {errors.shipmentType?.message && (
                    <p className="mt-1 text-sm text-red-600">{errors.shipmentType.message}</p>
                  )}
                </div>
                {shipmentType === 'd2d' && (
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                      htmlFor="d2dDispatchMode"
                    >
                      D2D dispatch mode
                    </label>
                    <select
                      id="d2dDispatchMode"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      {...register('d2dDispatchMode')}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choose dispatch mode
                      </option>
                      <option value="air">Air</option>
                      <option value="sea">Sea</option>
                    </select>
                    {errors.d2dDispatchMode?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.d2dDispatchMode.message}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button type="submit" variant="primary" isLoading={review.isPending}>
            {decision === 'approve' ? 'Approve claim' : 'Reject claim'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ title, onClose, children }: ModalProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
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


/**
 * Extracts an R2 storage key from a public proof URL. R2 public URLs follow
 * `https://<host>/<r2Key>` — the key is the entire URL path. Returns null
 * for malformed URLs.
 *
 * BE follow-up: the cleaner fix is to expose `proofR2Keys: string[]` on
 * the GalleryClaim shape so we donʼt have to URL-parse here.
 */
function extractR2KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

interface ClaimProofLinkProps {
  url: string;
  index: number;
}

/**
 * One proof attachment in the claim review queue. Calls the file-scan
 * endpoint to gate the "open in new tab" link. Pending → disabled with a
 * spinner pill; flagged / errored → disabled with a red pill; clean /
 * skipped → real link.
 */
function ClaimProofLink({ url, index }: ClaimProofLinkProps): ReactElement {
  const r2Key = useMemo(() => extractR2KeyFromUrl(url), [url]);
  const { data, isLoading } = useFileScanStatus(r2Key);
  const status = data?.status;
  const isSafe = status !== undefined && SAFE_FILE_SCAN_STATUSES.includes(status);

  if (!r2Key) {
    return (
      <li className="text-xs text-gray-400">Proof #{index + 1} (key missing)</li>
    );
  }

  return (
    <li className="inline-flex items-center gap-1.5">
      {isSafe ? (
        <a
          className="text-xs font-semibold text-brand-700 hover:underline"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Proof #{index + 1}
        </a>
      ) : (
        <span className="text-xs font-semibold text-gray-400" title={isLoading ? "Checking scan status" : "Not viewable"}>
          Proof #{index + 1}
        </span>
      )}
      {status && <FileScanPill status={status} compact />}
    </li>
  );
}
