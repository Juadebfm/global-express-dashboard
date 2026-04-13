import type { ComponentType, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { Button, Card, Checkbox, Input, StepIndicator } from '@/components/ui';
import { ROUTES } from '@/constants';
import { apiPatch } from '@/lib/apiClient';
import { syncClerkAccount, updateMyNotificationPreferences } from '@/services';

type SignUpStep = 'account' | 'verify' | 'details';
type AccountType = 'individual' | 'business';

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

const SIGN_UP_STEP_ORDER: SignUpStep[] = ['account', 'verify', 'details'];

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
            ? 'flex w-full items-center justify-between rounded-lg border border-red-500 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500'
            : 'flex w-full items-center justify-between rounded-lg border border-[#DDE5E9] bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
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
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const inputClassName = 'text-sm placeholder:text-sm';
  const buttonTextClassName = 'text-sm';
  const emailPattern = /\S+@\S+\.\S+/;

  const [step, setStep] = useState<SignUpStep>('account');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [form, setForm] = useState<SignUpFormState>(initialFormState);
  const [verificationCode, setVerificationCode] = useState('');
  const [usePhoneForWhatsapp, setUsePhoneForWhatsapp] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>('NG');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Only redirect already-completed users away from the signup page.
  // Do NOT redirect mid-signup (after setActive but before details step).
  useEffect(() => {
    if (isSignedIn && clerkUser?.unsafeMetadata?.profileCompleted === true) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isSignedIn, navigate, clerkUser]);

  const selectedCountryOption =
    COUNTRY_OPTIONS.find((item) => item.code === selectedCountry) ||
    COUNTRY_OPTIONS[0];

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const stripLeadingZeros = (value: string) => value.replace(/^0+/, '');

  const buildE164 = (value: string) => {
    const digits = stripLeadingZeros(normalizeDigits(value));
    if (!digits) {
      return '';
    }
    return `${selectedCountryOption.dialCode}${digits}`;
  };

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

  const handleAccountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};

    if (accountType === 'business') {
      if (!form.businessName.trim()) {
        nextErrors.businessName = t('externalSignUp.validation.businessNameRequired');
      }
    } else {
      if (!form.firstName.trim()) {
        nextErrors.firstName = t('externalSignUp.validation.firstNameRequired');
      }
      if (!form.lastName.trim()) {
        nextErrors.lastName = t('externalSignUp.validation.lastNameRequired');
      }
    }

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

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isLoaded || !signUp) {
      setFormError('Sign up is not ready yet. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp.create({
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        emailAddress: form.email.trim(),
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!verificationCode.trim()) {
      setFormError('Enter the verification code sent to your email.');
      return;
    }

    if (!isLoaded || !signUp) {
      setFormError('Sign up is not ready yet. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        if (!setActive) {
          throw new Error('Unable to start a session.');
        }
        await setActive({ session: result.createdSessionId });
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token is missing.');
        }
        await syncClerkAccount(token);
        setStep('details');
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

    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token is missing.');
      }

      // Auto-provision backend user before saving profile
      await syncClerkAccount(token);

      // PATCH /users/me with all profile fields
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

      // Save marketing consent if opted in
      if (form.consentMarketing) {
        await updateMyNotificationPreferences(token, { consentMarketing: true });
      }

      // Mark profile complete so returning users skip this step
      await clerkUser?.update({ unsafeMetadata: { profileCompleted: true } });

      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAccountStepValid =
    (accountType === 'business'
      ? !!form.businessName.trim()
      : !!form.firstName.trim() && !!form.lastName.trim()) &&
    !!form.email.trim() &&
    emailPattern.test(form.email.trim()) &&
    !!form.password.trim() &&
    form.password.trim().length >= 8;

  const isDetailsStepValid =
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
              ? 'w-full rounded-lg border border-red-500 px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-red-500'
              : 'w-full rounded-lg border border-[#DDE5E9] px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400'
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
      <Card className="p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <StepIndicator
          className="mb-6"
          steps={[
            { id: 'account', label: t('externalSignUp.title') },
            { id: 'verify', label: t('externalSignUp.verifyTitle') },
            { id: 'details', label: t('externalSignUp.profileTitle') },
          ]}
          currentIndex={currentStepIndex}
          onStepSelect={handleStepSelect}
          isStepEnabled={(index, indexCurrent) => index <= indexCurrent}
        />

        {step === 'account' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('externalSignUp.title')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('externalSignUp.subtitle')}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('externalSignUp.accountType')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={
                    accountType === 'individual'
                      ? 'rounded-lg border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700'
                      : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300'
                  }
                >
                  {t('externalSignUp.individual')}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('business')}
                  className={
                    accountType === 'business'
                      ? 'rounded-lg border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700'
                      : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300'
                  }
                >
                  {t('externalSignUp.business')}
                </button>
              </div>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              {accountType === 'business' ? (
                <Input
                  label={t('externalSignUp.businessName')}
                  placeholder={t('externalSignUp.businessNamePlaceholder')}
                  value={form.businessName}
                  onChange={(event) => updateField('businessName', event.target.value)}
                  error={errors.businessName}
                  className={inputClassName}
                />
              ) : (
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
              )}

              <Input
                label={t('externalSignUp.emailLabel')}
                type="email"
                placeholder={t('externalSignUp.emailPlaceholder')}
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={errors.email}
                className={inputClassName}
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
              />

              <div id="clerk-captcha" data-cl-theme="light" data-cl-size="flexible" />

              <Button
                type="submit"
                className={`w-full ${buttonTextClassName}`}
                size="lg"
                isLoading={isSubmitting}
                disabled={!isLoaded || !isAccountStepValid}
              >
                {t('externalSignUp.continueButton')}
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

            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                label={t('externalSignUp.verificationCode')}
                placeholder={t('externalSignUp.codePlaceholder')}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                className={inputClassName}
              />

              <Button
                type="submit"
                className={`w-full ${buttonTextClassName}`}
                size="lg"
                isLoading={isSubmitting}
                disabled={!isLoaded}
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
                onClick={() => setStep('account')}
                className="font-medium text-gray-500 hover:text-gray-700"
              >
                {t('externalSignUp.backToDetails')}
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('externalSignUp.profileTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('externalSignUp.profileSubtitle')}
              </p>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
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

              <Button
                type="submit"
                className={`w-full ${buttonTextClassName}`}
                size="lg"
                isLoading={isSubmitting}
                disabled={!isDetailsStepValid}
              >
                {t('externalSignUp.completeRegistration')}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}
