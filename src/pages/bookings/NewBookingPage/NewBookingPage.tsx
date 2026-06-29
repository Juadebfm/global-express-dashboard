import type { ComponentType, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
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
import { useAuth, useAuthToken, useMySuppliers } from '@/hooks';
import { createOrder } from '@/services';
import { ROUTES } from '@/constants';
import { newBookingSchema, type NewBookingFormValues } from './schema';

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

  const { data: suppliersData } = useMySuppliers({ limit: 100 });
  const suppliers = suppliersData?.data ?? [];

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
      sourcingSupplierType: 'saved',
    },
  });

  const hasSourcingSupplier = useWatch({ control, name: 'hasSourcingSupplier' });
  const sourcingSupplierType = useWatch({ control, name: 'sourcingSupplierType' });
  const shipmentType = useWatch({ control, name: 'shipmentType' });

  const mutation = useMutation({
    mutationFn: async (values: NewBookingFormValues) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const sourcingSupplier = values.hasSourcingSupplier
        ? values.sourcingSupplierType === 'saved'
          ? { supplierId: values.sourcingSupplierId }
          : {
              name: values.sourcingSupplierName,
              phone: values.sourcingSupplierPhone || undefined,
              email: values.sourcingSupplierEmail || undefined,
            }
        : undefined;

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
                  {(['saved', 'new'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={type}
                        {...register('sourcingSupplierType')}
                        className="accent-brand-500"
                      />
                      <span className="text-sm text-gray-700">
                        {type === 'saved' ? 'Select from my saved suppliers' : 'Someone new'}
                      </span>
                    </label>
                  ))}
                </div>

                {sourcingSupplierType === 'saved' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Supplier
                    </label>
                    <Controller
                      control={control}
                      name="sourcingSupplierId"
                      render={({ field }) => (
                        <select
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none"
                        >
                          <option value="">Select a supplier…</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.businessName ?? `${s.firstName} ${s.lastName}`}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.sourcingSupplierId && (
                      <p className="text-sm text-red-600 mt-1.5">{errors.sourcingSupplierId.message}</p>
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
  );
}
