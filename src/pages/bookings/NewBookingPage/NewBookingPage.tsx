import type { ComponentType, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Country } from 'react-phone-number-input';
import {
  getCountries,
  getCountryCallingCode,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en';
import { AppLayout } from '@/components/layout';
import { Button, Card, Input, AlertBanner } from '@/components/ui';
import {
  useAuth,
  useAuthToken,
  useDebounce,
  useSupplierDirectory,
  useSupplierDirectorySupplier,
} from '@/hooks';
import { createOrder } from '@/services';
import { ROUTES } from '@/constants';
import type { SupplierDirectorySupplier, SupplierDirectorySummary } from '@/types';
import { newBookingSchema, type NewBookingFormValues } from './schema';
import { buildSourcingSupplier } from './bookingPayload';
import { EstimatePreview } from './components/EstimatePreview';

// ── Country selector ──────────────────────────────────────────────────────────

type CountryOption = {
  code: Country;
  name: string;
  dialCode: string;
};

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: (en as Record<string, string>)[code] || code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface CountrySelectProps {
  selected: CountryOption;
  onSelect: (code: Country) => void;
  isError?: boolean;
}

function CountrySelect({ selected, onSelect, isError = false }: CountrySelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent): void => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleToggle = (): void => {
    if (!isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 256 && rect.top > spaceBelow);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={wrapperRef} className="relative w-[130px] shrink-0 sm:w-[160px]">
      <button
        type="button"
        onClick={handleToggle}
        className={
          isError
            ? 'flex w-full items-center justify-between rounded-lg border border-red-500 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500'
            : 'flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {flags[selected.code] ? (
            (() => {
              const FlagIcon = flags[selected.code] as ComponentType<{ title?: string; className?: string }>;
              return <FlagIcon title={selected.name} className="h-4 w-5 shrink-0 rounded-sm" />;
            })()
          ) : (
            <span className="h-4 w-5 shrink-0 rounded-sm bg-gray-200" />
          )}
          <span className="text-gray-500 shrink-0">{selected.dialCode}</span>
        </span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>

      {isOpen && (
        <div
          className={
            openUpward
              ? 'absolute bottom-full z-20 mb-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg'
              : 'absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg'
          }
          role="listbox"
        >
          {COUNTRY_OPTIONS.map((option) => {
            const FlagIcon = flags[option.code] as ComponentType<{ title?: string; className?: string }>;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => { onSelect(option.code); setIsOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                role="option"
                aria-selected={option.code === selected.code}
              >
                {FlagIcon ? (
                  <FlagIcon title={option.name} className="h-4 w-5 rounded-sm" />
                ) : (
                  <span className="h-4 w-5 rounded-sm bg-gray-200" />
                )}
                <span className="flex-1 text-left">{option.name}</span>
                <span className="text-gray-500 shrink-0">{option.dialCode}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Supplier directory ──────────────────────────────────────────────────────

interface SupplierDetailsModalProps {
  supplier: SupplierDirectorySummary;
  details: SupplierDirectorySupplier | undefined;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  onSelect: (supplier: SupplierDirectorySummary) => void;
}

function formatVerificationStatus(status: string): string {
  return status.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SupplierDetailsModal({
  supplier,
  details,
  isLoading,
  error,
  onClose,
  onSelect,
}: SupplierDetailsModalProps): ReactElement {
  const directorySupplier = details ?? supplier;
  const whatsappHref = details?.publicWhatsapp
    ? `https://wa.me/${details.publicWhatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:px-4"
      role="presentation"
    >
      <div
        className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-details-title"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Supplier directory</p>
            <h2 id="supplier-details-title" className="mt-1 text-lg font-semibold text-gray-900">
              {directorySupplier.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close supplier details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex items-center gap-3">
            {directorySupplier.logoUrl ? (
              <img
                src={directorySupplier.logoUrl}
                alt=""
                className="h-12 w-12 rounded-xl border border-gray-100 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-lg font-semibold text-brand-700">
                {directorySupplier.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                {directorySupplier.city}, {directorySupplier.country}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Status: {formatVerificationStatus(directorySupplier.verificationStatus)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">Services</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {directorySupplier.services.map((service) => (
                <span key={service} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {service}
                </span>
              ))}
            </div>
          </div>

          {isLoading && (
            <p className="text-sm text-gray-500" role="status">Loading approved contact details…</p>
          )}
          {error && (
            <AlertBanner
              tone="error"
              message="We could not load this supplier's contact details. You can still select it or try another supplier."
            />
          )}
          {details && (
            <div>
              <p className="text-sm font-medium text-gray-900">Approved contact channels</p>
              <div className="mt-2 space-y-2">
                {details.publicEmail && (
                  <a
                    href={`mailto:${details.publicEmail}`}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <Mail className="h-4 w-4 text-gray-400" />
                    {details.publicEmail}
                  </a>
                )}
                {details.publicPhone && (
                  <a
                    href={`tel:${details.publicPhone}`}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <Phone className="h-4 w-4 text-gray-400" />
                    {details.publicPhone}
                  </a>
                )}
                {details.publicWhatsapp && whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    {details.publicWhatsapp}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Choose another</Button>
            <Button type="button" onClick={() => onSelect(directorySupplier)}>Use this supplier</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function randomIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function NewBookingPage(): ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const idempotencyKey = useRef(randomIdempotencyKey());

  // Phone country state
  const [selectedCountry, setSelectedCountry] = useState<Country>('NG');
  const [phoneDigits, setPhoneDigits] = useState('');

  const selectedCountryOption =
    COUNTRY_OPTIONS.find((item) => item.code === selectedCountry) ?? COUNTRY_OPTIONS[0]!;

  const buildE164 = useCallback((digits: string): string => {
    const cleaned = digits.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleaned) return '';
    return `${selectedCountryOption.dialCode}${cleaned}`;
  }, [selectedCountryOption.dialCode]);

  const layoutUser = {
    displayName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
      : '',
    email: user?.email ?? '',
    avatarUrl: '/images/favicon.svg',
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<NewBookingFormValues>({
    resolver: zodResolver(newBookingSchema),
    defaultValues: {
      shipmentType: 'air',
      hasSourcingSupplier: false,
      sourcingSupplierType: 'directory',
    },
  });

  const hasSourcingSupplier = useWatch({ control, name: 'hasSourcingSupplier' });
  const sourcingSupplierType = useWatch({ control, name: 'sourcingSupplierType' });
  const shipmentType = useWatch({ control, name: 'shipmentType' });
  const weight = useWatch({ control, name: 'weight' });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDirectoryPage, setSupplierDirectoryPage] = useState(1);
  const [supplierDetails, setSupplierDetails] = useState<SupplierDirectorySummary | null>(null);
  const [selectedDirectorySupplier, setSelectedDirectorySupplier] = useState<SupplierDirectorySummary | null>(null);
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);
  const isDirectorySelection = hasSourcingSupplier && sourcingSupplierType === 'directory';
  const { data: supplierDirectory, isLoading: isSupplierDirectoryLoading, error: supplierDirectoryError } =
    useSupplierDirectory(
      { q: debouncedSupplierSearch, page: supplierDirectoryPage, limit: 10 },
      isDirectorySelection,
    );
  const {
    data: supplierDirectoryDetails,
    isLoading: isSupplierDirectoryDetailsLoading,
    error: supplierDirectoryDetailsError,
  } = useSupplierDirectorySupplier(supplierDetails?.id ?? null);

  const mutation = useMutation({
    mutationFn: async (values: NewBookingFormValues) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const sourcingSupplier = buildSourcingSupplier(values);

      return createOrder(
        {
          recipientName: values.recipientName,
          recipientPhone: values.recipientPhone,
          recipientEmail: values.recipientEmail ?? '',
          orderDirection: 'inbound',
          weight: values.weight,
          declaredValue: values.declaredValue,
          description: values.description,
          shipmentType: values.shipmentType,
          sourcingSupplier,
        },
        token,
        idempotencyKey.current,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <AppLayout user={layoutUser}>
        <div className="max-w-lg mx-auto">
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Booking received</p>
              <p className="mt-1 text-sm text-gray-500">
                We'll notify your supplier and update your tracking once your goods are assigned to a dispatch.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.DASHBOARD)}>
                View my shipments
              </Button>
              <Button size="sm" onClick={() => {
                idempotencyKey.current = randomIdempotencyKey();
                reset();
                setPhoneDigits('');
                setSupplierSearch('');
                setSupplierDirectoryPage(1);
                setSupplierDetails(null);
                setSelectedDirectorySupplier(null);
                setSubmitted(false);
              }}>
                Book another
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout user={layoutUser}>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Booking</h1>
          <p className="mt-1 text-sm text-gray-500">Tell us what you're shipping and who should receive it.</p>
        </div>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
          {/* Step 1 */}
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">What are you shipping?</p>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="What goods are you sending?"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none hover:border-gray-400 resize-none"
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1.5">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Shipment type
              </label>
              <div className="flex gap-3">
                {(['air', 'sea'] as const).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={type}
                      {...register('shipmentType')}
                      className="accent-brand-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label={shipmentType === 'sea' ? 'Volume (CBM)' : 'Weight'}
              placeholder={shipmentType === 'sea' ? 'e.g. 0.3cbm' : 'e.g. 5kg'}
              error={errors.weight?.message}
              {...register('weight')}
            />

            <EstimatePreview shipmentType={shipmentType} rawWeight={weight ?? ''} />

            <Input
              label="Declared value (USD)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              error={errors.declaredValue?.message}
              {...register('declaredValue')}
            />
          </Card>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 2 */}
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Who is involved?</p>

            <Input
              label="Recipient name"
              placeholder="Full name"
              error={errors.recipientName?.message}
              {...register('recipientName')}
            />

            {/* Recipient phone with country selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Recipient phone
              </label>
              <div className="flex gap-2">
                <CountrySelect
                  selected={selectedCountryOption}
                  onSelect={setSelectedCountry}
                  isError={!!errors.recipientPhone}
                />
                <input
                  type="tel"
                  value={phoneDigits}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setPhoneDigits(digits);
                    setValue('recipientPhone', buildE164(digits), { shouldValidate: true });
                  }}
                  placeholder="Phone number"
                  className={
                    errors.recipientPhone
                      ? 'w-full rounded-lg border border-red-500 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500'
                      : 'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
                  }
                />
              </div>
              {errors.recipientPhone && (
                <p className="text-sm text-red-600">{errors.recipientPhone.message}</p>
              )}
            </div>

            <Input
              label="Recipient email (optional)"
              type="email"
              placeholder="email@example.com"
              error={errors.recipientEmail?.message}
              {...register('recipientEmail')}
            />

            {/* Sourcing supplier toggle */}
            <div className="pt-1">
              <Controller
                control={control}
                name="hasSourcingSupplier"
                render={({ field }) => (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="accent-brand-500 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">
                      I have a supplier sending these goods to GEX Korea
                    </span>
                  </label>
                )}
              />
            </div>

            {hasSourcingSupplier && (
              <div className="space-y-4 pt-1">
                <div className="flex gap-4">
                  {(['directory', 'new'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={type}
                        checked={sourcingSupplierType === type}
                        onChange={() => {
                          setValue('sourcingSupplierType', type, { shouldValidate: true });
                          if (type === 'new') {
                            setValue('sourcingSupplierId', undefined, { shouldValidate: true });
                            setSelectedDirectorySupplier(null);
                          }
                        }}
                        className="accent-brand-500"
                      />
                      <span className="text-sm text-gray-700">
                        {type === 'directory' ? 'Search supplier directory' : 'Someone new'}
                      </span>
                    </label>
                  ))}
                </div>

                {sourcingSupplierType === 'directory' ? (
                  <div className="space-y-3">
                    {selectedDirectorySupplier && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-brand-700">Selected supplier</p>
                          <p className="truncate text-sm font-semibold text-gray-900">{selectedDirectorySupplier.name}</p>
                          <p className="mt-0.5 text-xs text-gray-600">
                            {selectedDirectorySupplier.city}, {selectedDirectorySupplier.country}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setValue('sourcingSupplierId', undefined, { shouldValidate: true });
                            setSelectedDirectorySupplier(null);
                          }}
                          className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800"
                        >
                          Change
                        </button>
                      </div>
                    )}
                    <div>
                      <label htmlFor="supplier-directory-search" className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Find your supplier
                      </label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          id="supplier-directory-search"
                          type="search"
                          value={supplierSearch}
                          onChange={(event) => {
                            setSupplierSearch(event.target.value);
                            setSupplierDirectoryPage(1);
                          }}
                          placeholder="Search by supplier name"
                          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400"
                        />
                      </div>
                    </div>

                    {supplierDirectoryError && (
                      <AlertBanner tone="error" message={supplierDirectoryError.message} />
                    )}

                    {isSupplierDirectoryLoading ? (
                      <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500" role="status">
                        Searching the supplier directory…
                      </p>
                    ) : supplierDirectory?.data.length ? (
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        {supplierDirectory.data.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => setSupplierDetails(supplier)}
                            className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                          >
                            {supplier.logoUrl ? (
                              <img src={supplier.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl border border-gray-100 object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                                {supplier.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-gray-900">{supplier.name}</span>
                              <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {supplier.city}, {supplier.country}
                              </span>
                            </span>
                            <span className="text-xs font-medium text-brand-600">View details</span>
                          </button>
                        ))}
                      </div>
                    ) : !supplierDirectoryError ? (
                      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        No matching supplier found. Choose “Someone new” below to enter their details for this booking.
                      </p>
                    ) : null}

                    {supplierDirectory?.pagination && supplierDirectory.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<ChevronLeft className="h-4 w-4" />}
                          disabled={supplierDirectory.pagination.page <= 1}
                          onClick={() => setSupplierDirectoryPage((page) => page - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-gray-500">
                          Page {supplierDirectory.pagination.page} of {supplierDirectory.pagination.totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          rightIcon={<ChevronRight className="h-4 w-4" />}
                          disabled={supplierDirectory.pagination.page >= supplierDirectory.pagination.totalPages}
                          onClick={() => setSupplierDirectoryPage((page) => page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Selecting a directory supplier only links it to this booking; it does not change their profile.
                    </p>

                    {errors.sourcingSupplierId && (
                      <p className="text-sm text-red-600">{errors.sourcingSupplierId.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Supplier name"
                      placeholder="Business or contact name"
                      error={errors.sourcingSupplierName?.message}
                      {...register('sourcingSupplierName')}
                    />
                    <Input
                      label="Supplier phone (optional)"
                      type="tel"
                      {...register('sourcingSupplierPhone')}
                    />
                    <Input
                      label="Supplier email (optional)"
                      type="email"
                      {...register('sourcingSupplierEmail')}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {mutation.error instanceof Error && (
            <AlertBanner tone="error" message={mutation.error.message} />
          )}

          <Button
            type="submit"
            size="md"
            className="w-full"
            isLoading={mutation.isPending}
          >
            Place booking
          </Button>
        </form>
      </div>
      </AppLayout>
      {supplierDetails && (
        <SupplierDetailsModal
          supplier={supplierDetails}
          details={supplierDirectoryDetails}
          isLoading={isSupplierDirectoryDetailsLoading}
          error={supplierDirectoryDetailsError}
          onClose={() => setSupplierDetails(null)}
          onSelect={(supplier) => {
            setValue('sourcingSupplierId', supplier.id, { shouldValidate: true });
            setSelectedDirectorySupplier(supplier);
            setSupplierDetails(null);
          }}
        />
      )}
    </>
  );
}
