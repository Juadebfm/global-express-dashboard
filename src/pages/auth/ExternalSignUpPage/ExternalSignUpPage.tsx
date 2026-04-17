import type { ComponentType, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useSignUp, useUser } from '@clerk/clerk-react';
import type { Country } from 'react-phone-number-input';
import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Checkbox, Input, OtpInput, StepIndicator } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useLanguage } from '@/hooks';
import { apiPatch } from '@/lib/apiClient';
import {
  updateMyNotificationPreferences,
} from '@/services';

type SignUpStep = 'details' | 'verify';

type CountryOption = {
  code: Country;
  name: string;
  dialCode: string;
};

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: en[code] || code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface SignUpFormState {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  password: string;
  phone: string;
  whatsappNumber: string;
  consentMarketing: boolean;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
  addressPostalCode: string;
}

const initialFormState: SignUpFormState = {
  firstName: '',
  lastName: '',
  businessName: '',
  email: '',
  password: '',
  phone: '',
  whatsappNumber: '',
  consentMarketing: false,
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressCountry: 'Nigeria',
  addressPostalCode: '',
};

const SIGN_UP_STEP_ORDER: SignUpStep[] = ['details', 'verify'];

class SyncValidationError extends Error {
  missingFields: string[];

  constructor(message: string, missingFields: string[]) {
    super(message);
    this.name = 'SyncValidationError';
    this.missingFields = missingFields;
  }
}

function extractMissingFields(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const container = payload as Record<string, unknown>;
  const fromRoot = container.missingFields;
  const fromData =
    container.data && typeof container.data === 'object'
      ? (container.data as Record<string, unknown>).missingFields
      : undefined;

  const value = Array.isArray(fromRoot) ? fromRoot : fromData;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: Array<{ message?: string }> };
    const message = clerkError.errors?.[0]?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

interface CountrySelectProps {
  selected: CountryOption;
  onSelect: (code: Country) => void;
  isError?: boolean;
}

function CountrySelect({
  selected,
  onSelect,
  isError = false,
}: CountrySelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 256 && rect.top > spaceBelow);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={wrapperRef} className="relative min-w-[170px]">
      <button
        type="button"
        onClick={handleToggle}
        className={
          isError
            ? 'auth-form-control flex w-full items-center justify-between rounded-lg border border-red-500 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500'
            : 'auth-form-control flex w-full items-center justify-between rounded-lg border border-[#DDE5E9] bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {flags[selected.code] ? (
            (() => {
              const FlagIcon = flags[selected.code] as ComponentType<{
                title?: string;
                className?: string;
              }>;
              return (
                <FlagIcon
                  title={selected.name}
                  className="h-4 w-5 rounded-sm"
                />
              );
            })()
          ) : (
            <span className="h-4 w-5 rounded-sm bg-gray-200" />
          )}
          <span className="truncate">{selected.name}</span>
          <span className="text-gray-500">{selected.dialCode}</span>
        </span>
        <span className="text-gray-500">▾</span>
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
            const FlagIcon = flags[option.code] as ComponentType<{
              title?: string;
              className?: string;
            }>;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  onSelect(option.code);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                role="option"
                aria-selected={option.code === selected.code}
              >
                {FlagIcon ? (
                  <FlagIcon
                    title={option.name}
                    className="h-4 w-5 rounded-sm"
                  />
                ) : (
                  <span className="h-4 w-5 rounded-sm bg-gray-200" />
                )}
                <span className="flex-1 text-left">{option.name}</span>
                <span className="text-gray-500">{option.dialCode}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExternalSignUpPage(): ReactElement {
  const { t } = useTranslation('auth');
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const inputClassName = 'auth-form-control text-sm placeholder:text-sm';
  const buttonTextClassName = 'text-sm';
  const emailPattern = /\S+@\S+\.\S+/;

  const [step, setStep] = useState<SignUpStep>('details');
  const [form, setForm] = useState<SignUpFormState>(initialFormState);
  const [verificationCode, setVerificationCode] = useState('');
  const [usePhoneForWhatsapp, setUsePhoneForWhatsapp] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>('NG');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsFinishSetupRetry, setNeedsFinishSetupRetry] = useState(false);
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);

  const selectedCountryOption =
    COUNTRY_OPTIONS.find((item) => item.code === selectedCountry) ||
    COUNTRY_OPTIONS[0];

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');

  const buildE164 = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits) {
      return '';
    }
    return `${selectedCountryOption.dialCode}${digits}`;
  }, [selectedCountryOption.dialCode]);

  const isValidPhone = (value: string) => {
    const formatted = buildE164(value);
    if (!formatted) {
      return false;
    }
    return isPossiblePhoneNumber(formatted);
  };

  const updateField = <K extends keyof SignUpFormState>(
    key: K,
    value: SignUpFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const syncCurrentSession = useCallback(async (): Promise<string> => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication token is missing.');
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const payload = await response.json().catch(() => null);
    if (response.ok) {
      return token;
    }

    if (response.status === 422) {
      const missingFields = extractMissingFields(payload);
      const message = missingFields.length > 0
        ? `Missing required fields: ${missingFields.join(', ')}.`
        : (
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string' &&
          payload.message.trim()
            ? payload.message
            : 'Some required profile fields are missing. Please complete the form and try again.'
        );

      throw new SyncValidationError(message, missingFields);
    }

    const message =
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string' &&
      payload.message.trim()
        ? payload.message
        : 'Unable to sync your account right now. Please try again.';

    throw new Error(message);
  }, [getToken]);

  const finalizeProfileSetup = useCallback(async (token: string): Promise<void> => {
    await apiPatch(
      '/users/me',
      {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        phone: buildE164(form.phone),
        whatsappNumber: form.whatsappNumber.trim()
          ? buildE164(form.whatsappNumber)
          : undefined,
        addressStreet: form.addressStreet.trim(),
        addressCity: form.addressCity.trim(),
        addressState: form.addressState.trim(),
        addressCountry: form.addressCountry.trim(),
        addressPostalCode: form.addressPostalCode.trim(),
      },
      token
    );

    if (form.consentMarketing) {
      await updateMyNotificationPreferences(token, { consentMarketing: true });
    }

    await clerkUser?.update({ unsafeMetadata: { profileCompleted: true } });
    navigate(ROUTES.DASHBOARD, { replace: true });
  }, [buildE164, clerkUser, form, navigate]);

  const handleFinishSetupRetry = useCallback(async (): Promise<void> => {
    setFormError(null);
    setIsFinishingSetup(true);

    try {
      await syncCurrentSession();
      setNeedsFinishSetupRetry(false);
      setStep('details');
    } catch (error) {
      if (error instanceof SyncValidationError) {
        setNeedsFinishSetupRetry(false);
        setStep('details');
        setFormError(error.message);
        return;
      }
      setNeedsFinishSetupRetry(true);
      setStep('verify');
      setFormError(getErrorMessage(error));
    } finally {
      setIsFinishingSetup(false);
    }
  }, [syncCurrentSession]);

  // If user already has an active Clerk session, sync and continue with the unified details step.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || step !== 'details') {
      return;
    }

    void handleFinishSetupRetry();
  }, [handleFinishSetupRetry, isLoaded, isSignedIn, step]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const normalizedVerificationCode = verificationCode.replace(/\D/g, '').slice(0, 6);

    if (normalizedVerificationCode.length !== 6) {
      setFormError('Enter the 6-digit verification code sent to your email.');
      return;
    }

    if (!isLoaded || !signUp) {
      setFormError('Sign up is not ready yet. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: normalizedVerificationCode,
      });

      if (result.status === 'complete') {
        if (!setActive) {
          throw new Error('Unable to start a session.');
        }
        await setActive({ session: result.createdSessionId });

        let token: string;
        try {
          token = await syncCurrentSession();
        } catch (error) {
          if (error instanceof SyncValidationError) {
            setNeedsFinishSetupRetry(false);
            setStep('details');
            setFormError(error.message);
            return;
          }
          setNeedsFinishSetupRetry(true);
          setFormError(getErrorMessage(error));
          return;
        }

        await finalizeProfileSetup(token);
      } else {
        const missingFields = (result as { missingFields?: string[] }).missingFields;
        if (missingFields && missingFields.length > 0) {
          setFormError(
            `Verification incomplete. Missing: ${missingFields.join(', ')}.`
          );
        } else {
          setFormError('Verification incomplete. Please try again.');
        }
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setFormError(null);

    if (!isLoaded || !signUp) {
      setFormError('Sign up is not ready yet. Please try again.');
      return;
    }

    setIsResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const handleDetailsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};

    if (!isSignedIn) {
      if (!form.email.trim()) {
        nextErrors.email = t('externalSignUp.validation.emailRequired');
      } else if (!emailPattern.test(form.email.trim())) {
        nextErrors.email = t('externalSignUp.validation.emailInvalid');
      }

      if (!form.password.trim()) {
        nextErrors.password = t('externalSignUp.validation.passwordRequired');
      } else if (form.password.trim().length < 8) {
        nextErrors.password = t('externalSignUp.validation.passwordMinLength');
      }
    }

    if (!form.phone.trim()) {
      nextErrors.phone = t('externalSignUp.validation.phoneRequired');
    } else if (!isValidPhone(form.phone)) {
      nextErrors.phone = t('externalSignUp.validation.phoneInvalid');
    }

    // whatsappNumber is optional — only validate format if provided
    if (form.whatsappNumber.trim() && !isValidPhone(form.whatsappNumber)) {
      nextErrors.whatsappNumber = t('externalSignUp.validation.whatsappInvalid');
    }

    if (!form.addressStreet.trim()) {
      nextErrors.addressStreet = t('externalSignUp.validation.streetRequired');
    }

    if (!form.addressCity.trim()) {
      nextErrors.addressCity = t('externalSignUp.validation.cityRequired');
    }

    if (!form.addressState.trim()) {
      nextErrors.addressState = t('externalSignUp.validation.stateRequired');
    }

    if (!form.addressCountry.trim()) {
      nextErrors.addressCountry = t('externalSignUp.validation.countryRequired');
    }

    if (!form.addressPostalCode.trim()) {
      nextErrors.addressPostalCode = t('externalSignUp.validation.postalCodeRequired');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded) {
      setFormError('Sign up is not ready yet. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignedIn) {
        const token = await syncCurrentSession();
        await finalizeProfileSetup(token);
        return;
      }

      if (!signUp) {
        setFormError('Sign up is not ready yet. Please try again.');
        return;
      }

      await signUp.create({
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        emailAddress: form.email.trim(),
        password: form.password,
        unsafeMetadata: {
          phone: buildE164(form.phone),
          addressStreet: form.addressStreet.trim(),
          addressCity: form.addressCity.trim(),
          addressState: form.addressState.trim(),
          addressCountry: form.addressCountry.trim(),
          addressPostalCode: form.addressPostalCode.trim(),
          businessName: form.businessName.trim() || undefined,
          whatsappNumber: form.whatsappNumber.trim() ? buildE164(form.whatsappNumber) : undefined,
          preferredLanguage: language,
        },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationCode('');
      setNeedsFinishSetupRetry(false);
      setStep('verify');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDetailsStepValid =
    (isSignedIn ||
      (
        !!form.email.trim() &&
        emailPattern.test(form.email.trim()) &&
        !!form.password.trim() &&
        form.password.trim().length >= 8
      )) &&
    !!form.phone.trim() &&
    isValidPhone(form.phone) &&
    (!form.whatsappNumber.trim() || isValidPhone(form.whatsappNumber)) &&
    !!form.addressStreet.trim() &&
    !!form.addressCity.trim() &&
    !!form.addressState.trim() &&
    !!form.addressCountry.trim() &&
    !!form.addressPostalCode.trim();

  const currentStepIndex = SIGN_UP_STEP_ORDER.indexOf(step);

  const handleStepSelect = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= SIGN_UP_STEP_ORDER.length) return;
    if (targetIndex > currentStepIndex) return;
    setFormError(null);
    setStep(SIGN_UP_STEP_ORDER[targetIndex]);
  };

  const renderPhoneField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    error?: string,
    disabled?: boolean
  ) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex gap-2">
        <CountrySelect
          selected={selectedCountryOption}
          onSelect={setSelectedCountry}
          isError={!!error}
        />
        <input
          type="tel"
          value={value}
          onChange={(event) => onChange(normalizeDigits(event.target.value))}
          placeholder="Phone number"
          disabled={disabled}
          className={
            error
              ? 'auth-form-control w-full rounded-lg border border-red-500 px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'auth-form-control w-full rounded-lg border border-[#DDE5E9] px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
          }
          aria-invalid={error ? 'true' : 'false'}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  return (
    <AuthLayout>
      <div className="space-y-8">
        <StepIndicator
          className="mx-1"
          steps={[
            { id: 'details', label: t('externalSignUp.title') },
            { id: 'verify', label: t('externalSignUp.verifyTitle') },
          ]}
          currentIndex={currentStepIndex}
          onStepSelect={handleStepSelect}
          isStepEnabled={(index, indexCurrent) => index <= indexCurrent}
        />

        <Card className="auth-panel-card p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
          </div>

        {step === 'verify' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('externalSignUp.verifyTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('externalSignUp.verifySubtitle', { email: form.email })}
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {needsFinishSetupRetry ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('externalSignUp.finishSetupHint')}
                </p>
                <Button
                  type="button"
                  className={`auth-cta-btn w-full ${buttonTextClassName}`}
                  size="lg"
                  isLoading={isFinishingSetup}
                  onClick={() => void handleFinishSetupRetry()}
                  disabled={!isLoaded}
                >
                  {t('externalSignUp.finishSetupAction')}
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('externalSignUp.verificationCode')}
                    </label>
                    <OtpInput
                      length={6}
                      autoFocus
                      value={verificationCode}
                      onChange={(value) => {
                        setVerificationCode(value);
                        setFormError(null);
                      }}
                      disabled={isSubmitting || !isLoaded}
                    />
                  </div>

                  <Button
                    type="submit"
                    className={`auth-cta-btn w-full ${buttonTextClassName}`}
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={!isLoaded || verificationCode.length !== 6}
                  >
                    {t('externalSignUp.verifyEmail')}
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="font-medium text-brand-500 hover:text-brand-600"
                    disabled={isResending}
                  >
                    {isResending ? t('externalSignUp.resending') : t('externalSignUp.resendCode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="font-medium text-gray-500 hover:text-gray-700"
                  >
                    {t('externalSignUp.backToDetails')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'details' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('externalSignUp.title')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('externalSignUp.subtitle')}
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('externalSignUp.firstName')}
                  placeholder={t('externalSignUp.firstNamePlaceholder')}
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  error={errors.firstName}
                  className={inputClassName}
                />
                <Input
                  label={t('externalSignUp.lastName')}
                  placeholder={t('externalSignUp.lastNamePlaceholder')}
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  error={errors.lastName}
                  className={inputClassName}
                />
              </div>

              <Input
                label={t('externalSignUp.businessName')}
                placeholder={t('externalSignUp.businessNamePlaceholder')}
                value={form.businessName}
                onChange={(event) => updateField('businessName', event.target.value)}
                error={errors.businessName}
                className={inputClassName}
              />

              <Input
                label={t('externalSignUp.emailLabel')}
                type="email"
                placeholder={t('externalSignUp.emailPlaceholder')}
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={errors.email}
                className={inputClassName}
                disabled={isSignedIn}
              />

              <Input
                label={t('externalSignUp.passwordLabel')}
                type="password"
                placeholder={t('externalSignUp.passwordPlaceholder')}
                showPasswordToggle
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                error={errors.password}
                className={inputClassName}
                disabled={isSignedIn}
              />

              {renderPhoneField(
                t('externalSignUp.phoneLabel'),
                form.phone,
                (value) => {
                  updateField('phone', value);
                  if (usePhoneForWhatsapp) {
                    updateField('whatsappNumber', value);
                  }
                },
                errors.phone
              )}

              <div className="space-y-2">
                {renderPhoneField(
                  t('externalSignUp.whatsappLabel'),
                  form.whatsappNumber,
                  (value) => updateField('whatsappNumber', value),
                  errors.whatsappNumber,
                  usePhoneForWhatsapp
                )}
                <Checkbox
                  label={t('externalSignUp.sameAsPhone')}
                  checked={usePhoneForWhatsapp}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUsePhoneForWhatsapp(checked);
                    if (checked) {
                      updateField('whatsappNumber', form.phone);
                    }
                  }}
                />
              </div>

              <Input
                label={t('externalSignUp.streetAddress')}
                placeholder={t('externalSignUp.streetPlaceholder')}
                value={form.addressStreet}
                onChange={(event) => updateField('addressStreet', event.target.value)}
                error={errors.addressStreet}
                className={inputClassName}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('externalSignUp.city')}
                  placeholder={t('externalSignUp.cityPlaceholder')}
                  value={form.addressCity}
                  onChange={(event) => updateField('addressCity', event.target.value)}
                  error={errors.addressCity}
                  className={inputClassName}
                />
                <Input
                  label={t('externalSignUp.state')}
                  placeholder={t('externalSignUp.statePlaceholder')}
                  value={form.addressState}
                  onChange={(event) => updateField('addressState', event.target.value)}
                  error={errors.addressState}
                  className={inputClassName}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('externalSignUp.country')}
                  placeholder={t('externalSignUp.countryPlaceholder')}
                  value={form.addressCountry}
                  onChange={(event) => updateField('addressCountry', event.target.value)}
                  error={errors.addressCountry}
                  className={inputClassName}
                />
                <Input
                  label={t('externalSignUp.postalCode')}
                  placeholder={t('externalSignUp.postalCodePlaceholder')}
                  value={form.addressPostalCode}
                  onChange={(event) => updateField('addressPostalCode', event.target.value)}
                  error={errors.addressPostalCode}
                  className={inputClassName}
                />
              </div>

              <Checkbox
                label={t('externalSignUp.consentMarketing')}
                checked={form.consentMarketing}
                onChange={(event) => updateField('consentMarketing', event.target.checked)}
              />

              {!isSignedIn && <div id="clerk-captcha" data-cl-theme="light" data-cl-size="flexible" />}

              <Button
                type="submit"
                className={`auth-cta-btn w-full ${buttonTextClassName}`}
                size="lg"
                isLoading={isSubmitting}
                disabled={!isDetailsStepValid}
              >
                {isSignedIn ? t('externalSignUp.completeRegistration') : t('externalSignUp.continueButton')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t('externalSignUp.hasAccount')}{' '}
              <Link
                to={ROUTES.SIGN_IN}
                className="font-medium text-brand-500 hover:text-brand-600"
              >
                {t('externalSignUp.signIn')}
              </Link>
            </p>
          </div>
        )}
        </Card>
      </div>
    </AuthLayout>
  );
}
