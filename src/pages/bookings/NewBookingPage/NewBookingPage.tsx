import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { Button, Card, Input, AlertBanner } from '@/components/ui';
import { useAuth, useAuthToken, useMySuppliers } from '@/hooks';
import { createOrder } from '@/services';
import { ROUTES } from '@/constants';
import { newBookingSchema, type NewBookingFormValues } from './schema';

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
    watch,
    reset,
    formState: { errors },
  } = useForm<NewBookingFormValues>({
    resolver: zodResolver(newBookingSchema),
    defaultValues: {
      shipmentType: 'air',
      hasSourcingSupplier: false,
      sourcingSupplierType: 'saved',
    },
  });

  const hasSourcingSupplier = watch('hasSourcingSupplier');
  const sourcingSupplierType = watch('sourcingSupplierType');
  const shipmentType = watch('shipmentType');

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
              <Button size="sm" onClick={() => { idempotencyKey.current = randomIdempotencyKey(); reset(); setSubmitted(false); }}>
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

            <Input
              label="Recipient phone"
              type="tel"
              placeholder="+234 800 000 0000"
              error={errors.recipientPhone?.message}
              {...register('recipientPhone')}
            />

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
