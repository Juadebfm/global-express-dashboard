import { useCallback, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Car,
  ImageIcon,
  Mail,
  Package2,
  ShieldCheck,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  TurnstileGate,
  isTurnstileError,
  type TurnstileGateRef,
} from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  useFeedbackStore,
} from '@/store';
import {
  usePublicGallery,
  useSubmitAnonymousClaim,
  useSubmitPublicCarPurchase,
  useSubscribeToNewsletter,
} from '@/hooks';
import {
  anonymousCarPurchaseSchema,
  anonymousClaimSchema,
  newsletterSubscribeSchema,
  type AnonymousCarPurchaseFormData,
  type AnonymousClaimFormData,
  type NewsletterSubscribeFormData,
} from '@/components/forms';
import type {
  AnonymousCarPurchasePayload,
  GalleryItem,
  GalleryUploadContentType,
} from '@/types';

const ALLOWED_PROOF_TYPES: GalleryUploadContentType[] = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function isAllowedType(value: string): value is GalleryUploadContentType {
  return (ALLOWED_PROOF_TYPES as string[]).includes(value);
}

export default function GalleryPage(): ReactElement {
  const { data, isLoading, error } = usePublicGallery();
  const [claimTarget, setClaimTarget] = useState<GalleryItem | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<GalleryItem | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to={ROUTES.HOME} className="text-lg font-semibold text-gray-900">
            Global Express
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to={ROUTES.TRACK_PUBLIC} className="font-medium text-gray-600 hover:text-gray-900">
              Track
            </Link>
            <Link to={ROUTES.LOGIN} className="font-medium text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        <section>
          <h1 className="text-3xl font-semibold text-gray-900">Gallery</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Items awaiting an owner, cars for sale, and current promotions. Claim
            anonymous goods by tracking number, or express interest in a vehicle —
            our team follows up on every submission.
          </p>
        </section>

        {isLoading && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            Loading the gallery...
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            {error.message}
          </p>
        )}

        {data && (
          <>
            <GallerySection
              title="Anonymous goods awaiting claim"
              description="If you recognise an item from your tracking number, submit a claim with proof of ownership."
              icon={<Package2 className="h-5 w-5" />}
              items={data.anonymousGoods}
              emptyLabel="No goods awaiting claim right now."
              renderActions={(item) => (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => setClaimTarget(item)}
                >
                  Claim ownership
                </Button>
              )}
            />

            <GallerySection
              title="Cars for sale"
              description="First-come-first-served. Express interest below and we'll reach out with payment details."
              icon={<Car className="h-5 w-5" />}
              items={data.cars}
              emptyLabel="No cars listed at the moment."
              renderActions={(item) => (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => setPurchaseTarget(item)}
                >
                  Buy this car
                </Button>
              )}
            />

            <GallerySection
              title="Adverts & promotions"
              description="Limited-time announcements and shipping promotions."
              icon={<Tag className="h-5 w-5" />}
              items={data.adverts}
              emptyLabel="No active adverts."
            />

            <GallerySection
              title="Sales"
              description="Items currently on offer."
              icon={<ImageIcon className="h-5 w-5" />}
              items={data.sales}
              emptyLabel="No sale items right now."
            />
          </>
        )}

        <NewsletterSection />
      </main>

      {claimTarget && (
        <ClaimModal item={claimTarget} onClose={() => setClaimTarget(null)} />
      )}
      {purchaseTarget && (
        <CarPurchaseModal item={purchaseTarget} onClose={() => setPurchaseTarget(null)} />
      )}
    </div>
  );
}

interface GallerySectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  items: GalleryItem[];
  emptyLabel: string;
  renderActions?: (item: GalleryItem) => ReactNode;
}

function GallerySection({
  title,
  description,
  icon,
  items,
  emptyLabel,
  renderActions,
}: GallerySectionProps): ReactElement {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              {item.previewImageUrl ? (
                <img
                  src={item.previewImageUrl}
                  alt={item.title}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-gray-100 text-gray-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                  <p className="font-mono text-xs uppercase text-gray-500">
                    {item.trackingNumberMasked}
                  </p>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
                  )}
                  {item.itemType === 'car' && typeof item.carPriceNgn === 'number' && (
                    <p className="text-sm font-semibold text-brand-700">
                      NGN {item.carPriceNgn.toLocaleString()}
                    </p>
                  )}
                </div>
                {renderActions && <div className="mt-auto">{renderActions(item)}</div>}
                {!renderActions && item.ctaUrl && (
                  <a
                    href={item.ctaUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                  >
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ClaimModalProps {
  item: GalleryItem;
  onClose: () => void;
}

function ClaimModal({ item, onClose }: ClaimModalProps): ReactElement {
  const submit = useSubmitAnonymousClaim();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // Claim flow fires N+1 protected POSTs (N presigns + 1 submit). Each
  // consumes a single-use Turnstile token, so the hook requests a fresh
  // one per call via this ref.
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileGateRef | null>(null);
  // Stable callbacks so ref access lives outside the render-time closure
  // handleSubmit creates (satisfies react-hooks/refs).
  const resetTurnstile = useCallback(() => {
    setTurnstileToken('');
    turnstileRef.current?.reset();
  }, []);
  const requestNextToken = useCallback((): Promise<string> => {
    if (!turnstileRef.current) {
      return Promise.reject(new Error('Turnstile widget unavailable.'));
    }
    return turnstileRef.current.requestNextToken();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnonymousClaimFormData>({
    resolver: zodResolver(anonymousClaimSchema),
    defaultValues: {
      itemId: item.id,
      fullName: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      message: '',
    },
  });

  return (
    <Modal title="Claim ownership" onClose={onClose}>
      <p className="mb-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <ShieldCheck className="mr-2 inline h-4 w-4 text-brand-600" />
        Item: <span className="font-semibold">{item.title}</span> ·
        <span className="ml-1 font-mono text-xs uppercase">{item.trackingNumberMasked}</span>
      </p>
      <form
        // react-hooks/refs flags ref access in render-time closures; safe
        // here because the closure runs on submit (event handler) and the
        // ref is read via the stable callbacks above.
        // eslint-disable-next-line react-hooks/refs
        onSubmit={handleSubmit(async (values) => {
          if (files.length === 0) {
            setFileError('Attach at least one proof file (ID, invoice, packing slip).');
            return;
          }
          setFileError(null);
          try {
            await submit.mutate({
              trackingNumber: item.trackingNumberMasked,
              files,
              itemId: item.id,
              fullName: values.fullName,
              email: values.email,
              phone: values.phone,
              city: values.city?.trim() || undefined,
              country: values.country?.trim() || undefined,
              message: values.message?.trim() || undefined,
              // Hook calls this once per protected POST in the chain.
              getTurnstileToken: requestNextToken,
            });
            onClose();
          } catch (err) {
            if (isTurnstileError(err)) resetTurnstile();
            /* feedback handled in hook */
          }
        })}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Full name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input label="City (optional)" error={errors.city?.message} {...register('city')} />
        </div>
        <Input label="Country (optional)" error={errors.country?.message} {...register('country')} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Proof of ownership
          </label>
          <FileDropzone
            files={files}
            onChange={(next) => {
              setFiles(next);
              setFileError(null);
            }}
            onInvalidType={() => {
              pushMessage({
                tone: 'warning',
                message: 'Only PDF or image files are accepted.',
              });
            }}
          />
          {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="claimMessage">
            Message (optional)
          </label>
          <textarea
            id="claimMessage"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('message')}
          />
          {errors.message?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>

        <TurnstileGate ref={turnstileRef} onToken={setTurnstileToken} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submit.isPending}
            disabled={!turnstileToken || submit.isPending}
          >
            Submit claim
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CarPurchaseModalProps {
  item: GalleryItem;
  onClose: () => void;
}

function CarPurchaseModal({ item, onClose }: CarPurchaseModalProps): ReactElement {
  const submit = useSubmitPublicCarPurchase();
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileGateRef | null>(null);
  const resetTurnstile = useCallback(() => {
    setTurnstileToken('');
    turnstileRef.current?.reset();
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnonymousCarPurchaseFormData>({
    resolver: zodResolver(anonymousCarPurchaseSchema),
    defaultValues: { fullName: '', email: '', phone: '', city: '', country: '', message: '' },
  });

  return (
    <Modal title="Buy this car" onClose={onClose}>
      <p className="mb-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {item.title} —{' '}
        <span className="font-mono text-xs uppercase">{item.trackingNumberMasked}</span>
      </p>
      <form
        // react-hooks/refs flags ref access in render-time closures; safe
        // here because the closure runs on submit (event handler) and the
        // ref is read via the stable callbacks above.
        // eslint-disable-next-line react-hooks/refs
        onSubmit={handleSubmit(async (values) => {
          const payload: AnonymousCarPurchasePayload = {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            city: values.city?.trim() || undefined,
            country: values.country?.trim() || undefined,
            message: values.message?.trim() || undefined,
          };
          try {
            await submit.mutate({
              trackingNumber: item.trackingNumberMasked,
              payload,
              turnstileToken,
            });
            onClose();
          } catch (err) {
            if (isTurnstileError(err)) resetTurnstile();
            /* feedback handled in hook */
          }
        })}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input label="City (optional)" error={errors.city?.message} {...register('city')} />
        </div>
        <Input label="Country (optional)" error={errors.country?.message} {...register('country')} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="carMessage">
            Message (optional)
          </label>
          <textarea
            id="carMessage"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('message')}
          />
        </div>
        <TurnstileGate ref={turnstileRef} onToken={setTurnstileToken} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submit.isPending}
            disabled={!turnstileToken || submit.isPending}
          >
            Submit interest
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NewsletterSection(): ReactElement {
  const subscribe = useSubscribeToNewsletter();
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileGateRef | null>(null);
  const resetTurnstile = useCallback(() => {
    setTurnstileToken('');
    turnstileRef.current?.reset();
  }, []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterSubscribeFormData>({
    resolver: zodResolver(newsletterSubscribeSchema),
    defaultValues: { email: '' },
  });

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscribe to our newsletter</h2>
          <p className="text-sm text-gray-500">
            New gallery drops, route updates, and shipping promotions in your inbox.
          </p>
        </div>
      </div>
      <form
        // react-hooks/refs flags ref access in render-time closures; safe
        // here because the closure runs on submit (event handler) and the
        // ref is read via the stable callbacks above.
        // eslint-disable-next-line react-hooks/refs
        onSubmit={handleSubmit(async (values) => {
          try {
            await subscribe.mutate({ payload: values, turnstileToken });
            reset({ email: '' });
          } catch (err) {
            if (isTurnstileError(err)) resetTurnstile();
            /* feedback handled in hook */
          }
        })}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <div className="grow">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <div className="sm:pt-7">
          <Button
            type="submit"
            variant="primary"
            isLoading={subscribe.isPending}
            disabled={!turnstileToken || subscribe.isPending}
          >
            Subscribe
          </Button>
        </div>
      </form>
      <div className="mt-3">
        <TurnstileGate ref={turnstileRef} onToken={setTurnstileToken} />
      </div>
    </section>
  );
}

interface FileDropzoneProps {
  files: File[];
  onChange: (next: File[]) => void;
  onInvalidType: () => void;
}

function FileDropzone({ files, onChange, onInvalidType }: FileDropzoneProps): ReactElement {
  const accept = useMemo(() => ALLOWED_PROOF_TYPES.join(','), []);
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-700">
        <Upload className="h-4 w-4" />
        Choose files
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const next: File[] = [];
            for (const file of Array.from(event.target.files ?? [])) {
              if (!isAllowedType(file.type)) {
                onInvalidType();
                continue;
              }
              next.push(file);
            }
            event.target.value = '';
            if (next.length === 0) return;
            onChange([...files, ...next].slice(0, 5));
          }}
        />
      </label>
      <p className="mt-1 text-xs text-gray-500">Up to 5 PDFs or images.</p>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, idx) => (
            <li
              key={`${f.name}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700"
            >
              <span className="truncate font-medium">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== idx))}
                className="text-gray-400 transition hover:text-gray-600"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
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
