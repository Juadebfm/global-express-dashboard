import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { AppLayout } from '@/components/layout';
import { AlertBanner, Button, Card, Input } from '@/components/ui';
import { useAuth, useAuthToken } from '@/hooks';
import { PageHeader } from '@/pages/shared';
import { ROUTES } from '@/constants';
import {
  getInternalProfileRequirements,
  getMyProfile,
  getMyProfileCompleteness,
  updateInternalProfile,
  updateMyProfile,
} from '@/services';
import type {
  CustomerProfile,
  ProfileCompleteness,
  ProfileRequirements,
  StaffProfilePayload,
  DashboardUser,
  User,
} from '@/types';

type ProfileMode = 'external' | 'internal';

interface ExternalFormState {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  phone: string;
  whatsappNumber: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
  addressPostalCode: string;
}

const initialExternalForm: ExternalFormState = {
  firstName: '',
  lastName: '',
  email: '',
  businessName: '',
  phone: '',
  whatsappNumber: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
  addressPostalCode: '',
};

const initialInternalForm: StaffProfilePayload = {
  gender: 'male',
  dateOfBirth: '',
  phone: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
  addressPostalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  nationalId: '',
};

function toText(value: string | null | undefined): string {
  return value ?? '';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

function mapCustomerToForm(profile: CustomerProfile): ExternalFormState {
  return {
    firstName: toText(profile.firstName),
    lastName: toText(profile.lastName),
    email: toText(profile.email),
    businessName: toText(profile.businessName),
    phone: toText(profile.phone),
    whatsappNumber: toText(profile.whatsappNumber),
    addressStreet: toText(profile.addressStreet),
    addressCity: toText(profile.addressCity),
    addressState: toText(profile.addressState),
    addressCountry: toText(profile.addressCountry),
    addressPostalCode: toText(profile.addressPostalCode),
  };
}

function getInitials(firstName: string, lastName: string, email: string): string {
  const full = `${firstName} ${lastName}`.trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
    return initials.join('');
  }
  return email.charAt(0).toUpperCase() || 'GX';
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps): ReactElement {
  return (
    <div className="grid gap-2 border-b border-gray-100 py-3 sm:grid-cols-[220px_1fr] sm:items-center">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
        {value}
      </p>
    </div>
  );
}

export function ProfilePage(): ReactElement {
  const { t } = useTranslation('profile');
  const getToken = useAuthToken();
  const { user: authUser, refreshUser } = useAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const mode: ProfileMode = useMemo(() => {
    if (authUser && ['staff', 'admin', 'superadmin'].includes(authUser.role)) {
      return 'internal';
    }
    return 'external';
  }, [authUser]);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [externalForm, setExternalForm] = useState<ExternalFormState>(initialExternalForm);
  const [externalBaseline, setExternalBaseline] = useState<ExternalFormState>(initialExternalForm);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  const [internalForm, setInternalForm] = useState<StaffProfilePayload>(initialInternalForm);
  const [internalBaseline, setInternalBaseline] = useState<StaffProfilePayload>(initialInternalForm);
  const [requirements, setRequirements] = useState<ProfileRequirements>({
    requireNationalId: false,
  });
  const lastBootstrapKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setIsEditing(false);
  }, [mode]);

  const layoutUser: DashboardUser = useMemo(() => {
    if (authUser) {
      return {
        displayName:
          `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim() || 'User',
        email: authUser.email,
        avatarUrl: '/images/favicon.svg',
      };
    }

    if (clerkUser) {
      return {
        displayName:
          clerkUser.fullName ||
          clerkUser.firstName ||
          clerkUser.emailAddresses[0]?.emailAddress ||
          'Customer',
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        avatarUrl: clerkUser.imageUrl || '/images/favicon.svg',
      };
    }

    return {
      displayName: 'User',
      email: '',
      avatarUrl: '/images/favicon.svg',
    };
  }, [authUser, clerkUser]);

  useEffect(() => {
    if (mode !== 'external' || !clerkUser) return;

    const emailFromClerk =
      clerkUser.emailAddresses[0]?.emailAddress ?? '';

    setExternalForm((prev) => ({
      ...prev,
      firstName: prev.firstName || clerkUser.firstName || '',
      lastName: prev.lastName || clerkUser.lastName || '',
      email: prev.email || emailFromClerk,
    }));
  }, [clerkUser, mode]);

  useEffect(() => {
    const isInternalSessionReady = Boolean(authUser);
    const isExternalSessionReady = !authUser && isClerkLoaded && isClerkSignedIn;

    if (!isInternalSessionReady && !isExternalSessionReady) {
      return;
    }

    const bootstrapKey = mode === 'internal'
      ? `internal:${authUser?.id ?? ''}`
      : `external:${clerkUser?.id ?? ''}`;

    if (lastBootstrapKeyRef.current === bootstrapKey) {
      return;
    }
    lastBootstrapKeyRef.current = bootstrapKey;

    let isMounted = true;

    const bootstrap = async (): Promise<void> => {
      setIsBootstrapping(true);
      setProfileError(null);
      setValidationError(null);

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication token is missing.');

        if (mode === 'external') {
          const [profile, profileCompleteness] = await Promise.all([
            getMyProfile(token),
            getMyProfileCompleteness(token),
          ]);
          if (!isMounted) return;

          const mappedProfile = mapCustomerToForm(profile);
          setExternalForm(mappedProfile);
          setExternalBaseline(mappedProfile);
          setCompleteness(profileCompleteness);
          setIsEditing(false);
          return;
        }

        const requirementsResponse = await getInternalProfileRequirements(token);
        if (!isMounted) return;

        setRequirements(requirementsResponse);

        const hydrated = authUser as User & Partial<StaffProfilePayload>;
        const mappedInternal: StaffProfilePayload = {
          ...initialInternalForm,
          gender: hydrated.gender ?? initialInternalForm.gender,
          dateOfBirth: hydrated.dateOfBirth ?? initialInternalForm.dateOfBirth,
          phone: hydrated.phone ?? initialInternalForm.phone,
          addressStreet: hydrated.addressStreet ?? initialInternalForm.addressStreet,
          addressCity: hydrated.addressCity ?? initialInternalForm.addressCity,
          addressState: hydrated.addressState ?? initialInternalForm.addressState,
          addressCountry: hydrated.addressCountry ?? initialInternalForm.addressCountry,
          addressPostalCode: hydrated.addressPostalCode ?? initialInternalForm.addressPostalCode,
          emergencyContactName: hydrated.emergencyContactName ?? initialInternalForm.emergencyContactName,
          emergencyContactPhone: hydrated.emergencyContactPhone ?? initialInternalForm.emergencyContactPhone,
          emergencyContactRelationship:
            hydrated.emergencyContactRelationship ?? initialInternalForm.emergencyContactRelationship,
          nationalId: hydrated.nationalId ?? '',
        };
        setInternalForm(mappedInternal);
        setInternalBaseline(mappedInternal);
        setIsEditing(false);
      } catch (bootstrapError) {
        if (!isMounted) return;
        setProfileError(getErrorMessage(bootstrapError));
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [authUser, clerkUser?.id, getToken, isClerkLoaded, isClerkSignedIn, mode]);

  const handleExternalChange = <K extends keyof ExternalFormState>(
    key: K,
    value: ExternalFormState[K]
  ) => {
    setExternalForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
    setProfileSuccess(null);
  };

  const handleInternalChange = <K extends keyof StaffProfilePayload>(
    key: K,
    value: StaffProfilePayload[K]
  ) => {
    setInternalForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
    setProfileSuccess(null);
  };

  const identity = useMemo(() => {
    if (mode === 'external') {
      return {
        firstName: externalForm.firstName,
        lastName: externalForm.lastName,
        email: externalForm.email,
        roleLabel: t('identity.externalRole'),
      };
    }

    return {
      firstName: authUser?.firstName ?? '',
      lastName: authUser?.lastName ?? '',
      email: authUser?.email ?? '',
      roleLabel: t(`identity.roles.${authUser?.role ?? 'staff'}`, t('identity.internalRole')),
    };
  }, [authUser, externalForm.email, externalForm.firstName, externalForm.lastName, mode, t]);

  const initials = getInitials(identity.firstName, identity.lastName, identity.email);
  const displayValue = (value: string | null | undefined): string =>
    value && value.trim().length > 0 ? value : t('messages.notProvided');

  const handleStartEditing = () => {
    setProfileSuccess(null);
    setValidationError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setValidationError(null);
    setProfileError(null);
    setProfileSuccess(null);
    if (mode === 'external') {
      setExternalForm(externalBaseline);
    } else {
      setInternalForm(internalBaseline);
    }
    setIsEditing(false);
  };

  const handleExternalSave = async (): Promise<void> => {
    const requiredFields = [
      externalForm.phone,
      externalForm.addressStreet,
      externalForm.addressCity,
      externalForm.addressState,
      externalForm.addressCountry,
      externalForm.addressPostalCode,
    ];

    if (requiredFields.some((field) => !field.trim())) {
      setValidationError(t('messages.completeRequiredFields'));
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    setValidationError(null);
    setProfileSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      const updatedProfile = await updateMyProfile(token, {
        businessName: externalForm.businessName.trim() || undefined,
        phone: externalForm.phone.trim(),
        whatsappNumber: externalForm.whatsappNumber.trim() || undefined,
        addressStreet: externalForm.addressStreet.trim(),
        addressCity: externalForm.addressCity.trim(),
        addressState: externalForm.addressState.trim(),
        addressCountry: externalForm.addressCountry.trim(),
        addressPostalCode: externalForm.addressPostalCode.trim(),
      });

      const mappedProfile = mapCustomerToForm(updatedProfile);
      setExternalForm(mappedProfile);
      setExternalBaseline(mappedProfile);

      const profileCompleteness = await getMyProfileCompleteness(token);
      setCompleteness(profileCompleteness);
      setProfileSuccess(t('messages.externalSaved'));
      setIsEditing(false);
    } catch (saveError) {
      setProfileError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleInternalSave = async (): Promise<void> => {
    const requiredValues = [
      internalForm.gender,
      internalForm.dateOfBirth,
      internalForm.phone,
      internalForm.addressStreet,
      internalForm.addressCity,
      internalForm.addressState,
      internalForm.addressCountry,
      internalForm.addressPostalCode,
      internalForm.emergencyContactName,
      internalForm.emergencyContactPhone,
      internalForm.emergencyContactRelationship,
    ];

    if (requiredValues.some((field) => !field.trim())) {
      setValidationError(t('messages.completeRequiredFields'));
      return;
    }

    if (requirements.requireNationalId && !(internalForm.nationalId ?? '').trim()) {
      setValidationError(t('messages.nationalIdRequired'));
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    setValidationError(null);
    setProfileSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      const sanitizedInternal: StaffProfilePayload = {
        ...internalForm,
        nationalId: internalForm.nationalId?.trim() || '',
      };

      await updateInternalProfile(token, {
        ...sanitizedInternal,
        nationalId: sanitizedInternal.nationalId || undefined,
      });

      setInternalForm(sanitizedInternal);
      setInternalBaseline(sanitizedInternal);
      await refreshUser();
      setProfileSuccess(t('messages.internalSaved'));
      setIsEditing(false);
    } catch (saveError) {
      setProfileError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout user={layoutUser}>
      <div className="space-y-6">
        <PageHeader
          title={t('title')}
          subtitle={mode === 'external' ? t('subtitleExternal') : t('subtitleInternal')}
        />

        {profileError && <AlertBanner tone="error" message={profileError} />}
        {validationError && <AlertBanner tone="warning" message={validationError} />}
        {profileSuccess && <AlertBanner tone="success" message={profileSuccess} />}

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card className="rounded-3xl bg-white p-8">
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-50 text-5xl font-semibold text-brand-500">
                {initials}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {`${identity.firstName} ${identity.lastName}`.trim() || t('identity.fallbackName')}
                </p>
                <p className="mt-1 text-sm text-gray-600">{identity.email}</p>
                <p className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {identity.roleLabel}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl bg-white p-8">
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('identity.nameChangeNotice')}{' '}
              <Link to={ROUTES.SUPPORT} className="font-semibold text-brand-600 hover:text-brand-700">
                {t('identity.supportAction')}
              </Link>
            </div>

            {mode === 'external' && completeness && !completeness.isComplete && (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-semibold">{t('external.completenessTitle')}</p>
                {completeness.missingFields.length > 0 && (
                  <p className="mt-1">
                    {t('external.missingFieldsLabel')}: {completeness.missingFields.join(', ')}
                  </p>
                )}
              </div>
            )}

            {mode === 'external' ? (
              <div className="space-y-4">
                {!isEditing ? (
                  <>
                    <div className="space-y-1">
                      <DetailRow label={t('fields.firstName')} value={displayValue(externalForm.firstName)} />
                      <DetailRow label={t('fields.lastName')} value={displayValue(externalForm.lastName)} />
                      <DetailRow label={t('fields.email')} value={displayValue(externalForm.email)} />
                      <DetailRow label={t('fields.businessName')} value={displayValue(externalForm.businessName)} />
                      <DetailRow label={t('fields.phone')} value={displayValue(externalForm.phone)} />
                      <DetailRow label={t('fields.whatsappNumber')} value={displayValue(externalForm.whatsappNumber)} />
                      <DetailRow label={t('fields.streetAddress')} value={displayValue(externalForm.addressStreet)} />
                      <DetailRow label={t('fields.city')} value={displayValue(externalForm.addressCity)} />
                      <DetailRow label={t('fields.state')} value={displayValue(externalForm.addressState)} />
                      <DetailRow label={t('fields.country')} value={displayValue(externalForm.addressCountry)} />
                      <DetailRow label={t('fields.postalCode')} value={displayValue(externalForm.addressPostalCode)} />
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        className="auth-cta-btn min-w-52"
                        size="lg"
                        onClick={handleStartEditing}
                        disabled={isBootstrapping}
                      >
                        {t('actions.updateProfile')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <DetailRow label={t('fields.firstName')} value={displayValue(externalForm.firstName)} />
                      <DetailRow label={t('fields.lastName')} value={displayValue(externalForm.lastName)} />
                      <DetailRow label={t('fields.email')} value={displayValue(externalForm.email)} />
                    </div>

                    <Input
                      label={t('fields.businessName')}
                      value={externalForm.businessName}
                      onChange={(event) => handleExternalChange('businessName', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.phone')}
                        value={externalForm.phone}
                        onChange={(event) => handleExternalChange('phone', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.whatsappNumber')}
                        value={externalForm.whatsappNumber}
                        onChange={(event) => handleExternalChange('whatsappNumber', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <Input
                      label={t('fields.streetAddress')}
                      value={externalForm.addressStreet}
                      onChange={(event) => handleExternalChange('addressStreet', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.city')}
                        value={externalForm.addressCity}
                        onChange={(event) => handleExternalChange('addressCity', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.state')}
                        value={externalForm.addressState}
                        onChange={(event) => handleExternalChange('addressState', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.country')}
                        value={externalForm.addressCountry}
                        onChange={(event) => handleExternalChange('addressCountry', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.postalCode')}
                        value={externalForm.addressPostalCode}
                        onChange={(event) => handleExternalChange('addressPostalCode', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="min-w-44"
                        onClick={handleCancelEditing}
                        disabled={isSaving || isBootstrapping}
                      >
                        {t('actions.cancel')}
                      </Button>
                      <Button
                        type="button"
                        className="auth-cta-btn min-w-52"
                        size="lg"
                        isLoading={isSaving || isBootstrapping}
                        onClick={() => void handleExternalSave()}
                        disabled={isBootstrapping}
                      >
                        {t('actions.saveChanges')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!isEditing ? (
                  <>
                    <div className="space-y-1">
                      <DetailRow label={t('fields.firstName')} value={displayValue(authUser?.firstName)} />
                      <DetailRow label={t('fields.lastName')} value={displayValue(authUser?.lastName)} />
                      <DetailRow label={t('fields.email')} value={displayValue(authUser?.email)} />
                      <DetailRow label={t('fields.gender')} value={t(`internal.genders.${internalForm.gender}`)} />
                      <DetailRow label={t('fields.dateOfBirth')} value={displayValue(internalForm.dateOfBirth)} />
                      <DetailRow label={t('fields.phone')} value={displayValue(internalForm.phone)} />
                      <DetailRow label={t('fields.streetAddress')} value={displayValue(internalForm.addressStreet)} />
                      <DetailRow label={t('fields.city')} value={displayValue(internalForm.addressCity)} />
                      <DetailRow label={t('fields.state')} value={displayValue(internalForm.addressState)} />
                      <DetailRow label={t('fields.country')} value={displayValue(internalForm.addressCountry)} />
                      <DetailRow label={t('fields.postalCode')} value={displayValue(internalForm.addressPostalCode)} />
                      <DetailRow label={t('fields.emergencyName')} value={displayValue(internalForm.emergencyContactName)} />
                      <DetailRow label={t('fields.emergencyPhone')} value={displayValue(internalForm.emergencyContactPhone)} />
                      <DetailRow label={t('fields.emergencyRelationship')} value={displayValue(internalForm.emergencyContactRelationship)} />
                      {requirements.requireNationalId && (
                        <DetailRow label={t('fields.nationalId')} value={displayValue(internalForm.nationalId)} />
                      )}
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        className="auth-cta-btn min-w-52"
                        size="lg"
                        onClick={handleStartEditing}
                        disabled={isBootstrapping}
                      >
                        {t('actions.updateProfile')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <DetailRow label={t('fields.firstName')} value={displayValue(authUser?.firstName)} />
                      <DetailRow label={t('fields.lastName')} value={displayValue(authUser?.lastName)} />
                      <DetailRow label={t('fields.email')} value={displayValue(authUser?.email)} />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.gender')}</label>
                      <select
                        value={internalForm.gender}
                        onChange={(event) => handleInternalChange('gender', event.target.value as StaffProfilePayload['gender'])}
                        className="auth-form-control w-full rounded-lg border border-[#DDE5E9] bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400"
                        disabled={isBootstrapping}
                      >
                        <option value="male">{t('internal.genders.male')}</option>
                        <option value="female">{t('internal.genders.female')}</option>
                        <option value="other">{t('internal.genders.other')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.dateOfBirth')}</label>
                      <input
                        type="date"
                        value={internalForm.dateOfBirth}
                        onChange={(event) => handleInternalChange('dateOfBirth', event.target.value)}
                        className="auth-form-control w-full rounded-lg border border-[#DDE5E9] bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <Input
                      label={t('fields.phone')}
                      value={internalForm.phone}
                      onChange={(event) => handleInternalChange('phone', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

                    <Input
                      label={t('fields.streetAddress')}
                      value={internalForm.addressStreet}
                      onChange={(event) => handleInternalChange('addressStreet', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.city')}
                        value={internalForm.addressCity}
                        onChange={(event) => handleInternalChange('addressCity', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.state')}
                        value={internalForm.addressState}
                        onChange={(event) => handleInternalChange('addressState', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.country')}
                        value={internalForm.addressCountry}
                        onChange={(event) => handleInternalChange('addressCountry', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.postalCode')}
                        value={internalForm.addressPostalCode}
                        onChange={(event) => handleInternalChange('addressPostalCode', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <h3 className="pt-2 text-sm font-semibold text-gray-900">{t('internal.emergencyTitle')}</h3>

                    <Input
                      label={t('fields.emergencyName')}
                      value={internalForm.emergencyContactName}
                      onChange={(event) => handleInternalChange('emergencyContactName', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t('fields.emergencyPhone')}
                        value={internalForm.emergencyContactPhone}
                        onChange={(event) => handleInternalChange('emergencyContactPhone', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                      <Input
                        label={t('fields.emergencyRelationship')}
                        value={internalForm.emergencyContactRelationship}
                        onChange={(event) => handleInternalChange('emergencyContactRelationship', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    {requirements.requireNationalId && (
                      <Input
                        label={t('fields.nationalId')}
                        value={internalForm.nationalId ?? ''}
                        onChange={(event) => handleInternalChange('nationalId', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    )}

                    <div className="mt-2 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="min-w-44"
                        onClick={handleCancelEditing}
                        disabled={isSaving || isBootstrapping}
                      >
                        {t('actions.cancel')}
                      </Button>
                      <Button
                        type="button"
                        className="auth-cta-btn min-w-52"
                        size="lg"
                        isLoading={isSaving || isBootstrapping}
                        onClick={() => void handleInternalSave()}
                        disabled={isBootstrapping}
                      >
                        {t('actions.saveChanges')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
