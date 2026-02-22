import type { ComponentType, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import type { Country } from 'react-phone-number-input';
import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Checkbox, Input } from '@/components/ui';
import { ROUTES } from '@/constants';

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

interface FormState {
  phone: string;
  whatsappNumber: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
  addressPostalCode: string;
}

const initialFormState: FormState = {
  phone: '',
  whatsappNumber: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressCountry: 'Nigeria',
  addressPostalCode: '',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

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
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
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
              const FlagIcon = flags[selected.code] as ComponentType<{ title?: string; className?: string }>;
              return <FlagIcon title={selected.name} className="h-4 w-5 rounded-sm" />;
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
                <span className="text-gray-500">{option.dialCode}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CompleteProfilePage(): ReactElement {
  const navigate = useNavigate();
  const { getToken, isSignedIn, isLoaded: isClerkLoaded } = useAuth();
  const { user } = useUser();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [usePhoneForWhatsapp, setUsePhoneForWhatsapp] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>('NG');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not a Clerk user, redirect away
  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!isSignedIn) {
      navigate(ROUTES.HOME, { replace: true });
      return;
    }
    // If profile already marked complete, skip to dashboard
    if (user?.unsafeMetadata?.profileCompleted === true) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isClerkLoaded, isSignedIn, user, navigate]);

  const selectedCountryOption =
    COUNTRY_OPTIONS.find((item) => item.code === selectedCountry) || COUNTRY_OPTIONS[0];

  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const stripLeadingZeros = (value: string) => value.replace(/^0+/, '');

  const buildE164 = (value: string) => {
    const digits = stripLeadingZeros(normalizeDigits(value));
    if (!digits) return '';
    return `${selectedCountryOption.dialCode}${digits}`;
  };

  const isValidPhone = (value: string) => {
    const formatted = buildE164(value);
    if (!formatted) return false;
    return isPossiblePhoneNumber(formatted);
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(form.phone)) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    if (!form.whatsappNumber.trim()) {
      nextErrors.whatsappNumber = 'WhatsApp number is required.';
    } else if (!isValidPhone(form.whatsappNumber)) {
      nextErrors.whatsappNumber = 'Enter a valid WhatsApp number.';
    }

    if (!form.addressStreet.trim()) nextErrors.addressStreet = 'Street address is required.';
    if (!form.addressCity.trim()) nextErrors.addressCity = 'City is required.';
    if (!form.addressState.trim()) nextErrors.addressState = 'State is required.';
    if (!form.addressCountry.trim()) nextErrors.addressCountry = 'Country is required.';
    if (!form.addressPostalCode.trim()) nextErrors.addressPostalCode = 'Postal code is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiBaseUrl) {
      setFormError('Missing API base URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      const response = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: buildE164(form.phone),
          whatsappNumber: buildE164(form.whatsappNumber),
          addressStreet: form.addressStreet.trim(),
          addressCity: form.addressCity.trim(),
          addressState: form.addressState.trim(),
          addressCountry: form.addressCountry.trim(),
          addressPostalCode: form.addressPostalCode.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to save your details.');
      }

      // Mark profile complete in Clerk metadata so we skip this page on future logins
      await user?.update({ unsafeMetadata: { profileCompleted: true } });

      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhoneField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    error?: string,
    disabled?: boolean
  ) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
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
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );

  return (
    <AuthLayout>
      <Card className="p-8">
        <div className="flex justify-center mb-6">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Complete your profile</h2>
          <p className="mt-1 text-sm text-gray-600">
            We need your contact and address details to finish setup.
          </p>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderPhoneField(
            'Phone',
            form.phone,
            (value) => {
              updateField('phone', value);
              if (usePhoneForWhatsapp) updateField('whatsappNumber', value);
            },
            errors.phone
          )}

          <div className="space-y-2">
            {renderPhoneField(
              'WhatsApp Number',
              form.whatsappNumber,
              (value) => updateField('whatsappNumber', value),
              errors.whatsappNumber,
              usePhoneForWhatsapp
            )}
            <Checkbox
              label="Same as phone number"
              checked={usePhoneForWhatsapp}
              onChange={(event) => {
                const checked = event.target.checked;
                setUsePhoneForWhatsapp(checked);
                if (checked) updateField('whatsappNumber', form.phone);
              }}
            />
          </div>

          <Input
            label="Street Address"
            placeholder="12 Broad Street"
            value={form.addressStreet}
            onChange={(event) => updateField('addressStreet', event.target.value)}
            error={errors.addressStreet}
            className="text-sm placeholder:text-sm"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="Lagos"
              value={form.addressCity}
              onChange={(event) => updateField('addressCity', event.target.value)}
              error={errors.addressCity}
              className="text-sm placeholder:text-sm"
            />
            <Input
              label="State"
              placeholder="Lagos"
              value={form.addressState}
              onChange={(event) => updateField('addressState', event.target.value)}
              error={errors.addressState}
              className="text-sm placeholder:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country"
              placeholder="Nigeria"
              value={form.addressCountry}
              onChange={(event) => updateField('addressCountry', event.target.value)}
              error={errors.addressCountry}
              className="text-sm placeholder:text-sm"
            />
            <Input
              label="Postal Code"
              placeholder="100001"
              value={form.addressPostalCode}
              onChange={(event) => updateField('addressPostalCode', event.target.value)}
              error={errors.addressPostalCode}
              className="text-sm placeholder:text-sm"
            />
          </div>

          <Button
            type="submit"
            className="w-full text-sm"
            size="lg"
            isLoading={isSubmitting}
          >
            Save & Continue
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
