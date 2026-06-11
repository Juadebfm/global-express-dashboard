import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, PackageOpen } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  TurnstileGate,
  isTurnstileError,
  type TurnstileGateRef,
} from '@/components/ui';
import { ROUTES } from '@/constants';
import { useSubmitPublicD2dIntake } from '@/hooks';
import {
  publicD2dIntakeSchema,
  type PublicD2dIntakeFormData,
} from '@/components/forms';
import type { PublicD2dIntakeResult } from '@/types';

export default function D2dIntakePage(): ReactElement {
  const submit = useSubmitPublicD2dIntake();
  const [result, setResult] = useState<PublicD2dIntakeResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileGateRef | null>(null);
  // Stable callback so the ref-access lives outside the render-time closure
  // that handleSubmit creates (satisfies react-hooks/refs).
  const resetTurnstile = useCallback(() => {
    setTurnstileToken('');
    turnstileRef.current?.reset();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PublicD2dIntakeFormData>({
    resolver: zodResolver(publicD2dIntakeSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      goodsDescription: '',
      deliveryPhone: '',
      deliveryAddressLine1: '',
      deliveryState: '',
      deliveryCity: '',
      deliveryPostalCode: '',
      deliveryLandmark: '',
      wantsAccount: false,
      consentAcknowledgement: false,
      estimatedWeightKg: '0',
      estimatedCbm: '0',
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PackageOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Door-to-door intake</h1>
            <p className="text-sm text-gray-600">
              No account needed. Tell us what you're shipping and where it should go — our team
              follows up to confirm pricing and pickup.
            </p>
          </div>
        </div>

        {result ? (
          <SuccessCard result={result} onReset={() => {
            setResult(null);
            reset();
          }} />
        ) : (
          <form
            // react-hooks/refs flags ref access inside any render-time
            // closure; here the closure only runs on submit (an event
            // handler), and the ref is read via the stable `resetTurnstile`
            // callback. Safe to suppress.
            // eslint-disable-next-line react-hooks/refs
            onSubmit={handleSubmit(async (values) => {
              try {
                const trimmedOptional = (v: string | undefined): string | undefined => {
                  const t = (v ?? '').trim();
                  return t.length > 0 ? t : undefined;
                };
                const data = await submit.mutate({
                  payload: {
                    fullName: values.fullName,
                    email: values.email,
                    phone: values.phone,
                    city: values.city,
                    country: values.country,
                    goodsDescription: values.goodsDescription,
                    deliveryPhone: values.deliveryPhone,
                    deliveryAddressLine1: values.deliveryAddressLine1,
                    deliveryState: trimmedOptional(values.deliveryState),
                    deliveryCity: trimmedOptional(values.deliveryCity),
                    deliveryPostalCode: trimmedOptional(values.deliveryPostalCode),
                    deliveryLandmark: trimmedOptional(values.deliveryLandmark),
                    wantsAccount: values.wantsAccount,
                    consentAcknowledgement: values.consentAcknowledgement,
                    estimatedWeightKg: Number(values.estimatedWeightKg),
                    estimatedCbm: Number(values.estimatedCbm),
                  },
                  turnstileToken,
                });
                setResult(data);
              } catch (err) {
                // CAPTCHA failure → reset the widget so the user can re-issue
                // without reloading. Toast is handled in the hook.
                if (isTurnstileError(err)) resetTurnstile();
              }
            })}
            className="mt-8 space-y-8"
          >
            <Fieldset legend="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
                <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
                <Input label="City" error={errors.city?.message} {...register('city')} />
                <Input label="Country" error={errors.country?.message} {...register('country')} />
              </div>
            </Fieldset>

            <Fieldset legend="Goods to ship">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="goodsDescription">
                    Description
                  </label>
                  <textarea
                    id="goodsDescription"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    {...register('goodsDescription')}
                  />
                  {errors.goodsDescription?.message && (
                    <p className="mt-1 text-sm text-red-600">{errors.goodsDescription.message}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Estimated weight (kg)"
                    type="number"
                    step="0.01"
                    min="0"
                    error={errors.estimatedWeightKg?.message}
                    {...register('estimatedWeightKg')}
                  />
                  <Input
                    label="Estimated volume (cbm)"
                    type="number"
                    step="0.001"
                    min="0"
                    error={errors.estimatedCbm?.message}
                    {...register('estimatedCbm')}
                  />
                </div>
              </div>
            </Fieldset>

            <Fieldset legend="Delivery destination">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Recipient phone"
                  error={errors.deliveryPhone?.message}
                  {...register('deliveryPhone')}
                />
                <Input
                  label="Address line 1"
                  error={errors.deliveryAddressLine1?.message}
                  {...register('deliveryAddressLine1')}
                />
                <Input
                  label="State (optional)"
                  error={errors.deliveryState?.message}
                  {...register('deliveryState')}
                />
                <Input
                  label="City (optional)"
                  error={errors.deliveryCity?.message}
                  {...register('deliveryCity')}
                />
                <Input
                  label="Postal code (optional)"
                  error={errors.deliveryPostalCode?.message}
                  {...register('deliveryPostalCode')}
                />
                <Input
                  label="Landmark (optional)"
                  error={errors.deliveryLandmark?.message}
                  {...register('deliveryLandmark')}
                />
              </div>
            </Fieldset>

            <Fieldset legend="Consent">
              <div className="space-y-2">
                <Checkbox
                  label="Create an account so I can track this shipment online."
                  {...register('wantsAccount')}
                />
                <Checkbox
                  label="I acknowledge that pricing is finalized after the team reviews this request."
                  {...register('consentAcknowledgement')}
                />
                {errors.consentAcknowledgement?.message && (
                  <p className="text-sm text-red-600">
                    {errors.consentAcknowledgement.message}
                  </p>
                )}
              </div>
            </Fieldset>

            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <TurnstileGate ref={turnstileRef} onToken={setTurnstileToken} />
              <Button
                type="submit"
                variant="primary"
                isLoading={submit.isPending}
                disabled={!turnstileToken || submit.isPending}
              >
                Submit request
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

interface FieldsetProps {
  legend: string;
  children: ReactElement;
}

function Fieldset({ legend, children }: FieldsetProps): ReactElement {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">{legend}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface SuccessCardProps {
  result: PublicD2dIntakeResult;
  onReset: () => void;
}

function SuccessCard({ result, onReset }: SuccessCardProps): ReactElement {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        <h2 className="text-lg font-semibold">Request received</h2>
      </div>
      <p className="mt-2 text-sm">
        We've created support ticket{' '}
        <span className="font-mono text-xs">{result.ticket.id}</span>. Our team will reach out to{' '}
        <span className="font-medium">{result.contact.email}</span> shortly.
      </p>
      {result.contact.accountLinked && (
        <p className="mt-2 text-sm">
          We linked this request to your existing account — you can sign in to track progress.
        </p>
      )}
      {result.contact.registerIntent && !result.contact.accountLinked && (
        <p className="mt-2 text-sm">
          We'll email a one-click link to finish creating your account.
        </p>
      )}
      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={onReset}>
          Submit another request
        </Button>
      </div>
    </div>
  );
}
