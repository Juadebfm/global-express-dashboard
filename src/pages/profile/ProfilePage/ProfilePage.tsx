import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useClerk, useUser as useClerkUser } from '@clerk/clerk-react';
import { AppLayout } from '@/components/layout';
import { AvatarUploader } from '@/components/profile';
import { AlertBanner, Button, Card, ConfirmModal, Input } from '@/components/ui';
import {
  useAuth,
  useAuthToken,
  useCountries,
  useCountryStates,
  useCurrentUserAvatar,
  useSetCurrentUserAvatar,
  useStateCities,
} from '@/hooks';
import { PageHeader } from '@/pages/shared';
import { ROUTES, STAFF_COUNTRIES, RELATIONSHIP_OPTIONS, COUNTRY_LABELS, getStates, getCities } from '@/constants';
import { ApiError } from '@/lib/apiClient';
import { cn } from '@/utils';
import {
  deleteMyAccount,
  getMyProfile,
  getMyProfileCompleteness,
  updateInternalProfile,
  updateMyProfile,
} from '@/services';
import { useFeedbackStore } from '@/store';
import {
  getMissingInternalProfileFields,
  type InternalRequiredField,
} from './internalProfileValidation';
import type {
  CustomerProfile,
  ProfileCompleteness,
  StaffProfilePayload,
  DashboardUser,
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
  shippingMark: string;
  // null while the one-time customer edit is still available; ISO once consumed.
  shippingMarkUserEditedAt: string | null;
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
  shippingMark: '',
  shippingMarkUserEditedAt: null,
};

// Shipping mark is freeform: 1–100 characters, any case, spaces, hyphens etc.
// Client-side validation only checks length to avoid a round-trip.

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

function normaliseCountry(raw: string | null | undefined): 'SK' | 'Nigeria' | '' {
  if (!raw) return '';
  if (raw === 'South Korea' || raw === 'SK') return 'SK';
  if (raw === 'Nigeria') return 'Nigeria';
  return '';
}

function mapInternalToForm(profile: CustomerProfile): StaffProfilePayload {
  return {
    gender: (profile.gender as StaffProfilePayload['gender']) ?? 'male',
    dateOfBirth: profile.dateOfBirth ?? '',
    phone: profile.phone ?? '',
    addressStreet: profile.addressStreet ?? '',
    addressCity: profile.addressCity ?? '',
    addressState: profile.addressState ?? '',
    addressCountry: normaliseCountry(profile.addressCountry),
    addressPostalCode: profile.addressPostalCode ?? '',
    emergencyContactName: profile.emergencyContactName ?? '',
    emergencyContactPhone: profile.emergencyContactPhone ?? '',
    emergencyContactRelationship: profile.emergencyContactRelationship ?? '',
    nationalId: profile.nationalId ?? '',
  };
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
    shippingMark: toText(profile.shippingMark),
    shippingMarkUserEditedAt: profile.shippingMarkUserEditedAt ?? null,
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

const SELECT_CLASS = 'auth-form-control w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed';

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
  const navigate = useNavigate();
  const getToken = useAuthToken();
  const { user: authUser, refreshUser } = useAuth();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();
  const currentAvatarUrl = useCurrentUserAvatar();
  const setCurrentUserAvatar = useSetCurrentUserAvatar();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const internalUserId = authUser?.id;
  const internalUserRole = authUser?.role;

  const mode: ProfileMode = useMemo(() => {
    if (internalUserRole && ['staff', 'admin', 'superadmin'].includes(internalUserRole)) {
      return 'internal';
    }
    return 'external';
  }, [internalUserRole]);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [externalForm, setExternalForm] = useState<ExternalFormState>(initialExternalForm);
  const [externalBaseline, setExternalBaseline] = useState<ExternalFormState>(initialExternalForm);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  // Shipping-mark is its own little flow: one-time edit per customer, locked
  // forever after that. Sits separately from the broader "Update Profile"
  // form so the lock UI can stay obvious.
  const [isEditingShippingMark, setIsEditingShippingMark] = useState(false);
  const [shippingMarkInput, setShippingMarkInput] = useState('');
  const [shippingMarkError, setShippingMarkError] = useState<string | null>(null);
  const [shippingMarkSuccess, setShippingMarkSuccess] = useState<string | null>(null);
  const [isSavingShippingMark, setIsSavingShippingMark] = useState(false);
  const [markCopied, setMarkCopied] = useState(false);

  const [internalForm, setInternalForm] = useState<StaffProfilePayload>(initialInternalForm);
  const [internalBaseline, setInternalBaseline] = useState<StaffProfilePayload>(initialInternalForm);
  const [internalFieldErrors, setInternalFieldErrors] = useState<
    Partial<Record<InternalRequiredField, string>>
  >({});
  const lastBootstrapKeyRef = useRef<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const extCountries = useCountries();
  const extStates = useCountryStates(externalForm.addressCountry);
  const extCities = useStateCities(externalForm.addressCountry, externalForm.addressState);

  useEffect(() => {
    setIsEditing(false);
  }, [mode]);

  const layoutUser: DashboardUser = useMemo(() => {
    if (authUser) {
      return {
        displayName:
          `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim() || 'User',
        email: authUser.email,
        avatarUrl: currentAvatarUrl,
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
        avatarUrl: currentAvatarUrl ?? clerkUser.imageUrl ?? null,
      };
    }

    return {
      displayName: 'User',
      email: '',
        avatarUrl: null,
      };
  }, [authUser, clerkUser, currentAvatarUrl]);

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
    const isInternalSessionReady = Boolean(internalUserId);
    const isExternalSessionReady = !internalUserId && isClerkLoaded && isClerkSignedIn;

    if (!isInternalSessionReady && !isExternalSessionReady) {
      return;
    }

    const bootstrapKey = mode === 'internal'
      ? `internal:${internalUserId ?? ''}`
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
          // Fetch the two endpoints independently. A failing completeness
          // call (typical on a fresh BE deploy or when the endpoint hasn't
          // been added yet) was previously dragging the whole bootstrap
          // down via Promise.all → form stayed at initialExternalForm and
          // every row rendered "Not provided yet" even though /users/me
          // returned a fully populated record.
          const [profileResult, completenessResult] = await Promise.allSettled([
            getMyProfile(token),
            getMyProfileCompleteness(token),
          ]);
          if (!isMounted) return;

          if (profileResult.status === 'fulfilled') {
            const mappedProfile = mapCustomerToForm(profileResult.value);
            setExternalForm(mappedProfile);
            setExternalBaseline(mappedProfile);
          } else {
            // Only treat a failing /users/me as a hard error — without the
            // profile shape, there's nothing useful to render.
            throw profileResult.reason;
          }

          if (completenessResult.status === 'fulfilled') {
            setCompleteness(completenessResult.value);
          }
          // Silently swallow completeness failures: the banner is a
          // nice-to-have, not load-bearing for the profile view.

          setIsEditing(false);
          return;
        }

        const profileResponse = await getMyProfile(token);
        if (!isMounted) return;

        const mappedInternal = mapInternalToForm(profileResponse);
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
      // Reset so a remount (React Strict Mode in dev, or a real unmount/remount)
      // re-runs the bootstrap rather than being silently skipped by the guard above.
      lastBootstrapKeyRef.current = null;
    };
  }, [clerkUser?.id, getToken, internalUserId, isClerkLoaded, isClerkSignedIn, mode]);

  const handleExternalChange = <K extends keyof ExternalFormState>(
    key: K,
    value: ExternalFormState[K]
  ) => {
    setExternalForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'addressCountry') {
        next.addressState = '';
        next.addressCity = '';
      } else if (key === 'addressState') {
        next.addressCity = '';
      }
      return next;
    });
    setValidationError(null);
    setProfileSuccess(null);
  };

  const handleInternalChange = <K extends keyof StaffProfilePayload>(
    key: K,
    value: StaffProfilePayload[K]
  ) => {
    setInternalForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'addressCountry') {
        next.addressState = '';
        next.addressCity = '';
      } else if (key === 'addressState') {
        next.addressCity = '';
      }
      return next;
    });
    setInternalFieldErrors((prev) => {
      if (!prev[key as InternalRequiredField]) return prev;
      const next = { ...prev };
      delete next[key as InternalRequiredField];
      return next;
    });
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
      position: authUser?.position ?? null,
    };
  }, [authUser, externalForm.email, externalForm.firstName, externalForm.lastName, mode, t]);

  const initials = getInitials(identity.firstName, identity.lastName, identity.email);
  const displayValue = (value: string | null | undefined): string =>
    value && value.trim().length > 0 ? value : t('messages.notProvided');

  const handleStartEditing = () => {
    setProfileSuccess(null);
    setValidationError(null);
    setInternalFieldErrors({});
    setIsEditing(true);
  };

  const handleAvatarChanged = async (avatarUrl: string | null): Promise<void> => {
    if (authUser) {
      await refreshUser();
      return;
    }
    setCurrentUserAvatar(avatarUrl);
  };

  const handleCancelEditing = () => {
    setValidationError(null);
    setProfileError(null);
    setProfileSuccess(null);
    setInternalFieldErrors({});
    if (mode === 'external') {
      setExternalForm(externalBaseline);
    } else {
      setInternalForm(internalBaseline);
    }
    setIsEditing(false);
  };

  // Self-service delete — customers/suppliers only (mode === 'external').
  // Never optimistic: only clears session/cache and routes to sign-in after
  // the API call actually succeeds.
  const handleDeleteAccount = async (): Promise<void> => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');
      const result = await deleteMyAccount(token);
      sessionStorage.removeItem('globalxpress_token');
      sessionStorage.removeItem('globalxpress_refresh');
      if (isClerkSignedIn) await clerkSignOut();
      pushMessage({ tone: 'success', message: result.message });
      navigate(ROUTES.SIGN_IN, { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('deleteAccount.failedMessage'));
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
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
    const missingFields = getMissingInternalProfileFields(internalForm);
    if (missingFields.length > 0) {
      const errors = missingFields.reduce<Partial<Record<InternalRequiredField, string>>>(
        (next, field) => ({ ...next, [field]: t('messages.requiredField') }),
        {},
      );
      setInternalFieldErrors(errors);
      setValidationError(null);
      const firstField = missingFields[0];
      requestAnimationFrame(() => {
        const input = document.getElementById(`staff-profile-${firstField}`);
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input instanceof HTMLElement) input.focus();
      });
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    setValidationError(null);
    setInternalFieldErrors({});
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
        nationalId: sanitizedInternal.nationalId || null,
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

  const canEditShippingMark = externalForm.shippingMarkUserEditedAt === null;

  const handleCopyMark = useCallback((): void => {
    if (!externalForm.shippingMark) return;
    void navigator.clipboard.writeText(externalForm.shippingMark).then(() => {
      setMarkCopied(true);
      setTimeout(() => setMarkCopied(false), 2000);
    });
  }, [externalForm.shippingMark]);

  const handleStartEditShippingMark = () => {
    setShippingMarkError(null);
    setShippingMarkSuccess(null);
    setShippingMarkInput(externalForm.shippingMark);
    setIsEditingShippingMark(true);
  };

  const handleCancelEditShippingMark = () => {
    setShippingMarkError(null);
    setShippingMarkInput('');
    setIsEditingShippingMark(false);
  };

  const handleSaveShippingMark = async (): Promise<void> => {
    const normalised = shippingMarkInput.trim();
    if (normalised.length < 1 || normalised.length > 100) {
      setShippingMarkError(t('shippingMark.formatError'));
      return;
    }

    // No-op: saving the same value would consume the one-time edit without
    // actually changing anything. Just close the editor.
    if (normalised === externalForm.shippingMark) {
      setIsEditingShippingMark(false);
      return;
    }

    setIsSavingShippingMark(true);
    setShippingMarkError(null);
    setShippingMarkSuccess(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');

      const updatedProfile = await updateMyProfile(token, { shippingMark: normalised });
      const mappedProfile = mapCustomerToForm(updatedProfile);
      setExternalForm(mappedProfile);
      setExternalBaseline(mappedProfile);
      setIsEditingShippingMark(false);
      setShippingMarkSuccess(t('shippingMark.saved'));
    } catch (saveError) {
      // 409 means another tab / a stale local state tried to consume the edit
      // after it was already used. Refetch so the lock UI reflects reality.
      if (saveError instanceof ApiError && saveError.status === 409) {
        try {
          const token = await getToken();
          if (token) {
            const fresh = await getMyProfile(token);
            const mappedProfile = mapCustomerToForm(fresh);
            setExternalForm(mappedProfile);
            setExternalBaseline(mappedProfile);
          }
        } catch {
          // Best-effort refetch — if it fails the lock state will sync on
          // next page load. Don't mask the original conflict message.
        }
        setIsEditingShippingMark(false);
        setShippingMarkError(t('shippingMark.conflictError'));
        return;
      }
      setShippingMarkError(getErrorMessage(saveError));
    } finally {
      setIsSavingShippingMark(false);
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
              <AvatarUploader
                avatarUrl={currentAvatarUrl}
                initials={initials}
                getToken={getToken}
                onAvatarChanged={handleAvatarChanged}
              />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {`${identity.firstName} ${identity.lastName}`.trim() || t('identity.fallbackName')}
                </p>
                <p className="mt-1 text-sm text-gray-600">{identity.email}</p>
                <p className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {identity.roleLabel}
                </p>
                {identity.position && (
                  <p className="mt-2 text-sm text-gray-500">{identity.position}</p>
                )}
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

            {mode === 'external' && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('shippingMark.title')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {t('shippingMark.description')}
                    </p>
                  </div>
                </div>

                {shippingMarkError && (
                  <div className="mb-3">
                    <AlertBanner tone="error" message={shippingMarkError} />
                  </div>
                )}
                {shippingMarkSuccess && (
                  <div className="mb-3">
                    <AlertBanner tone="success" message={shippingMarkSuccess} />
                  </div>
                )}

                {!isEditingShippingMark ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <p className="flex-1 min-w-0 text-xl font-bold tracking-wide text-brand-600 leading-none truncate sm:text-3xl">
                        {externalForm.shippingMark || t('shippingMark.noneYet')}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {externalForm.shippingMark && (
                          <button
                            type="button"
                            onClick={handleCopyMark}
                            aria-label="Copy shipping mark"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:text-brand-600"
                          >
                            {markCopied
                              ? <Check className="h-4 w-4 text-green-500" />
                              : <Copy className="h-4 w-4" />}
                          </button>
                        )}
                        {canEditShippingMark ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleStartEditShippingMark}
                            disabled={isBootstrapping}
                          >
                            {t('shippingMark.edit')}
                          </Button>
                        ) : (
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-100"
                            aria-label="Locked"
                          >
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    {!canEditShippingMark && (
                      <p className="text-xs text-gray-500">
                        {t('shippingMark.lockedNotice')}{' '}
                        <Link
                          to={ROUTES.SUPPORT}
                          className="font-semibold text-brand-600 hover:text-brand-700"
                        >
                          {t('shippingMark.contactSupport')}
                        </Link>{' '}
                        {t('shippingMark.contactSupportToChange')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label={t('shippingMark.currentLabel')}
                      value={shippingMarkInput}
                      onChange={(event) =>
                        setShippingMarkInput(event.target.value)
                      }
                      placeholder={t('shippingMark.placeholder')}
                      className="auth-form-control text-sm font-mono"
                      maxLength={100}
                      autoComplete="off"
                      disabled={isSavingShippingMark}
                    />
                    <p className="text-xs text-gray-600">{t('shippingMark.format')}</p>
                    <p className="text-xs font-medium text-amber-700">
                      {t('shippingMark.oneTimeNotice')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleCancelEditShippingMark}
                        disabled={isSavingShippingMark}
                      >
                        {t('shippingMark.cancel')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        isLoading={isSavingShippingMark}
                        onClick={() => void handleSaveShippingMark()}
                      >
                        {t('shippingMark.save')}
                      </Button>
                    </div>
                  </div>
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
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.country')}</label>
                        <input
                          type="text"
                          list="ext-countries"
                          value={externalForm.addressCountry}
                          onChange={(e) => handleExternalChange('addressCountry', e.target.value)}
                          placeholder="Type or select"
                          className={SELECT_CLASS}
                          disabled={isBootstrapping}
                          autoComplete="off"
                        />
                        <datalist id="ext-countries">
                          {extCountries.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                      <Input
                        label={t('fields.postalCode')}
                        value={externalForm.addressPostalCode}
                        onChange={(event) => handleExternalChange('addressPostalCode', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.state')}</label>
                        <input
                          type="text"
                          list="ext-states"
                          value={externalForm.addressState}
                          onChange={(e) => handleExternalChange('addressState', e.target.value)}
                          placeholder="Type or select"
                          className={SELECT_CLASS}
                          disabled={isBootstrapping}
                          autoComplete="off"
                        />
                        <datalist id="ext-states">
                          {extStates.map((s) => <option key={s} value={s} />)}
                        </datalist>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.city')}</label>
                        <input
                          type="text"
                          list="ext-cities"
                          value={externalForm.addressCity}
                          onChange={(e) => handleExternalChange('addressCity', e.target.value)}
                          placeholder="Type or select"
                          className={SELECT_CLASS}
                          disabled={isBootstrapping}
                          autoComplete="off"
                        />
                        <datalist id="ext-cities">
                          {extCities.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
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
                      <DetailRow label={t('fields.country')} value={displayValue(COUNTRY_LABELS[internalForm.addressCountry] ?? internalForm.addressCountry)} />
                      <DetailRow label={t('fields.postalCode')} value={displayValue(internalForm.addressPostalCode)} />
                      <DetailRow label={t('fields.emergencyName')} value={displayValue(internalForm.emergencyContactName)} />
                      <DetailRow label={t('fields.emergencyPhone')} value={displayValue(internalForm.emergencyContactPhone)} />
                      <DetailRow label={t('fields.emergencyRelationship')} value={displayValue(internalForm.emergencyContactRelationship)} />
                      <DetailRow label={t('fields.nationalId')} value={displayValue(internalForm.nationalId)} />
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
                      <label htmlFor="staff-profile-gender" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.gender')} <span className="text-red-600">*</span></label>
                      <select
                        id="staff-profile-gender"
                        value={internalForm.gender}
                        onChange={(event) => handleInternalChange('gender', event.target.value as StaffProfilePayload['gender'])}
                        className={cn('auth-form-control w-full rounded-lg border bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 hover:border-gray-400', internalFieldErrors.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-brand-500')}
                        disabled={isBootstrapping}
                        aria-invalid={!!internalFieldErrors.gender}
                        aria-describedby={internalFieldErrors.gender ? 'staff-profile-gender-error' : undefined}
                      >
                        <option value="male">{t('internal.genders.male')}</option>
                        <option value="female">{t('internal.genders.female')}</option>
                        <option value="other">{t('internal.genders.other')}</option>
                      </select>
                      {internalFieldErrors.gender && <p id="staff-profile-gender-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.gender}</p>}
                    </div>

                    <div>
                      <label htmlFor="staff-profile-dateOfBirth" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.dateOfBirth')} <span className="text-red-600">*</span></label>
                      <input
                        id="staff-profile-dateOfBirth"
                        type="date"
                        value={internalForm.dateOfBirth}
                        onChange={(event) => handleInternalChange('dateOfBirth', event.target.value)}
                        className={cn('auth-form-control w-full rounded-lg border bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 hover:border-gray-400', internalFieldErrors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-brand-500')}
                        disabled={isBootstrapping}
                        aria-invalid={!!internalFieldErrors.dateOfBirth}
                        aria-describedby={internalFieldErrors.dateOfBirth ? 'staff-profile-dateOfBirth-error' : undefined}
                      />
                      {internalFieldErrors.dateOfBirth && <p id="staff-profile-dateOfBirth-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.dateOfBirth}</p>}
                    </div>

                    <Input
                      id="staff-profile-phone"
                      label={`${t('fields.phone')} *`}
                      value={internalForm.phone}
                      onChange={(event) => handleInternalChange('phone', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                      error={internalFieldErrors.phone}
                    />

                    <Input
                      id="staff-profile-addressStreet"
                      label={`${t('fields.streetAddress')} *`}
                      value={internalForm.addressStreet}
                      onChange={(event) => handleInternalChange('addressStreet', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                      error={internalFieldErrors.addressStreet}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="staff-profile-addressCountry" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.country')} <span className="text-red-600">*</span></label>
                        <select
                          id="staff-profile-addressCountry"
                          value={internalForm.addressCountry}
                          onChange={(e) => handleInternalChange('addressCountry', e.target.value as 'SK' | 'Nigeria' | '')}
                          className={cn(SELECT_CLASS, internalFieldErrors.addressCountry && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                          disabled={isBootstrapping}
                          aria-invalid={!!internalFieldErrors.addressCountry}
                          aria-describedby={internalFieldErrors.addressCountry ? 'staff-profile-addressCountry-error' : undefined}
                        >
                          <option value="">Select country</option>
                          {STAFF_COUNTRIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        {internalFieldErrors.addressCountry && <p id="staff-profile-addressCountry-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.addressCountry}</p>}
                      </div>
                      <Input
                        id="staff-profile-addressPostalCode"
                        label={`${t('fields.postalCode')} *`}
                        value={internalForm.addressPostalCode}
                        onChange={(event) => handleInternalChange('addressPostalCode', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                        error={internalFieldErrors.addressPostalCode}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="staff-profile-addressState" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.state')} <span className="text-red-600">*</span></label>
                        <select
                          id="staff-profile-addressState"
                          value={internalForm.addressState}
                          onChange={(e) => handleInternalChange('addressState', e.target.value)}
                          className={cn(SELECT_CLASS, internalFieldErrors.addressState && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                          disabled={isBootstrapping || !internalForm.addressCountry}
                          aria-invalid={!!internalFieldErrors.addressState}
                          aria-describedby={internalFieldErrors.addressState ? 'staff-profile-addressState-error' : undefined}
                        >
                          <option value="">Select state / province</option>
                          {getStates(internalForm.addressCountry).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {internalFieldErrors.addressState && <p id="staff-profile-addressState-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.addressState}</p>}
                      </div>
                      <div>
                        <label htmlFor="staff-profile-addressCity" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.city')} <span className="text-red-600">*</span></label>
                        <select
                          id="staff-profile-addressCity"
                          value={internalForm.addressCity}
                          onChange={(e) => handleInternalChange('addressCity', e.target.value)}
                          className={cn(SELECT_CLASS, internalFieldErrors.addressCity && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                          disabled={isBootstrapping || !internalForm.addressState}
                          aria-invalid={!!internalFieldErrors.addressCity}
                          aria-describedby={internalFieldErrors.addressCity ? 'staff-profile-addressCity-error' : undefined}
                        >
                          <option value="">Select city</option>
                          {getCities(internalForm.addressCountry, internalForm.addressState).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {internalFieldErrors.addressCity && <p id="staff-profile-addressCity-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.addressCity}</p>}
                      </div>
                    </div>

                    <h3 className="pt-2 text-sm font-semibold text-gray-900">{t('internal.emergencyTitle')}</h3>

                    <Input
                      id="staff-profile-emergencyContactName"
                      label={`${t('fields.emergencyName')} *`}
                      value={internalForm.emergencyContactName}
                      onChange={(event) => handleInternalChange('emergencyContactName', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                      error={internalFieldErrors.emergencyContactName}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        id="staff-profile-emergencyContactPhone"
                        label={`${t('fields.emergencyPhone')} *`}
                        value={internalForm.emergencyContactPhone}
                        onChange={(event) => handleInternalChange('emergencyContactPhone', event.target.value)}
                        className="auth-form-control text-sm"
                        disabled={isBootstrapping}
                        error={internalFieldErrors.emergencyContactPhone}
                      />
                      <div>
                        <label htmlFor="staff-profile-emergencyContactRelationship" className="mb-1.5 block text-sm font-medium text-gray-700">{t('fields.emergencyRelationship')} <span className="text-red-600">*</span></label>
                        <select
                          id="staff-profile-emergencyContactRelationship"
                          value={internalForm.emergencyContactRelationship}
                          onChange={(e) => handleInternalChange('emergencyContactRelationship', e.target.value)}
                          className={cn(SELECT_CLASS, internalFieldErrors.emergencyContactRelationship && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                          disabled={isBootstrapping}
                          aria-invalid={!!internalFieldErrors.emergencyContactRelationship}
                          aria-describedby={internalFieldErrors.emergencyContactRelationship ? 'staff-profile-emergencyContactRelationship-error' : undefined}
                        >
                          <option value="">Select relationship</option>
                          {RELATIONSHIP_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {internalFieldErrors.emergencyContactRelationship && <p id="staff-profile-emergencyContactRelationship-error" className="mt-1.5 text-sm text-red-600" role="alert">{internalFieldErrors.emergencyContactRelationship}</p>}
                      </div>
                    </div>

                    <Input
                      id="staff-profile-nationalId"
                      label={t('fields.nationalId')}
                      value={internalForm.nationalId ?? ''}
                      onChange={(event) => handleInternalChange('nationalId', event.target.value)}
                      className="auth-form-control text-sm"
                      disabled={isBootstrapping}
                    />

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

          {mode === 'external' && (
            <Card className="rounded-3xl border-red-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-red-700">{t('deleteAccount.title')}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t('deleteAccount.subtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('deleteAccount.deleteButton')}
                </button>
              </div>
              {deleteError && <div className="mt-4"><AlertBanner tone="error" message={deleteError} /></div>}
              <ConfirmModal
                isOpen={showDeleteConfirm}
                title={t('deleteAccount.modal.title')}
                message={t('deleteAccount.modal.message')}
                confirmLabel={t('deleteAccount.modal.confirmLabel')}
                cancelLabel={t('deleteAccount.modal.cancelLabel')}
                tone="danger"
                isLoading={isDeleting}
                onConfirm={() => void handleDeleteAccount()}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
