import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { Button, Card, Input, StepIndicator } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';
import {
  changeMyPassword,
  updateInternalProfile,
  getInternalProfileRequirements,
} from '@/services';
import type { StaffProfilePayload, ProfileRequirements } from '@/types';

type Step = 'change-password' | 'complete-profile';

const TOKEN_KEY = 'globalxpress_token';
const ONBOARDING_STEP_ORDER: Step[] = ['change-password', 'complete-profile'];

export function StaffOnboardingPage(): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  // Determine initial step
  const [step, setStep] = useState<Step>(() =>
    user?.mustChangePassword ? 'change-password' : 'complete-profile'
  );

  // ── Change Password State ──────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // ── Profile State ──────────────────────────────────────────────────────────
  const [requirements, setRequirements] = useState<ProfileRequirements>({ requireNationalId: false });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<StaffProfilePayload>({
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
  });

  // Redirect if user shouldn't be here
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    if (!user.mustChangePassword && !user.mustCompleteProfile) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Sync step when user flags change (e.g. after password change)
  useEffect(() => {
    if (user?.mustChangePassword) {
      setStep('change-password');
    } else if (user?.mustCompleteProfile) {
      setStep('complete-profile');
    }
  }, [user?.mustChangePassword, user?.mustCompleteProfile]);

  // Fetch profile requirements when entering profile step
  useEffect(() => {
    if (step !== 'complete-profile') return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    getInternalProfileRequirements(token)
      .then(setRequirements)
      .catch(() => {/* use defaults */});
  }, [step]);

  // ── Change Password Handler ────────────────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    setPwError(null);
    const tv = t('staffOnboarding.changePassword.validation', { returnObjects: true }) as Record<string, string>;

    if (!currentPassword) { setPwError(tv.currentRequired); return; }
    if (!newPassword) { setPwError(tv.newRequired); return; }
    if (newPassword.length < 8) { setPwError(tv.newMinLength); return; }
    if (!confirmPassword) { setPwError(tv.confirmRequired); return; }
    if (newPassword !== confirmPassword) { setPwError(tv.passwordsDoNotMatch); return; }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setPwLoading(true);
    try {
      await changeMyPassword(token, { currentPassword, newPassword });
      await refreshUser();
      // After success, move to profile step or dashboard
      if (user?.mustCompleteProfile) {
        setStep('complete-profile');
      } else {
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      }
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, t, user, navigate, refreshUser]);

  // ── Profile Update Handler ─────────────────────────────────────────────────
  const handleProfileSubmit = useCallback(async () => {
    setProfileError(null);
    const tv = t('staffOnboarding.completeProfile.validation', { returnObjects: true }) as Record<string, string>;

    if (!profile.gender) { setProfileError(tv.genderRequired); return; }
    if (!profile.dateOfBirth) { setProfileError(tv.dobRequired); return; }
    if (!profile.phone) { setProfileError(tv.phoneRequired); return; }
    if (!profile.addressStreet) { setProfileError(tv.streetRequired); return; }
    if (!profile.addressCity) { setProfileError(tv.cityRequired); return; }
    if (!profile.addressState) { setProfileError(tv.stateRequired); return; }
    if (!profile.addressCountry) { setProfileError(tv.countryRequired); return; }
    if (!profile.addressPostalCode) { setProfileError(tv.postalCodeRequired); return; }
    if (!profile.emergencyContactName) { setProfileError(tv.emergencyNameRequired); return; }
    if (!profile.emergencyContactPhone) { setProfileError(tv.emergencyPhoneRequired); return; }
    if (!profile.emergencyContactRelationship) { setProfileError(tv.emergencyRelationshipRequired); return; }
    if (requirements.requireNationalId && !profile.nationalId) { setProfileError(tv.nationalIdRequired); return; }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setProfileLoading(true);
    try {
      const payload: StaffProfilePayload = { ...profile };
      if (!requirements.requireNationalId && !payload.nationalId) {
        delete payload.nationalId;
      }
      await updateInternalProfile(token, payload);
      await refreshUser();
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileLoading(false);
    }
  }, [profile, requirements, t, navigate, refreshUser]);

  const updateField = <K extends keyof StaffProfilePayload>(key: K, value: StaffProfilePayload[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const currentStepIndex = ONBOARDING_STEP_ORDER.indexOf(step);

  const handleStepSelect = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= ONBOARDING_STEP_ORDER.length) return;
    if (targetIndex > currentStepIndex) return;
    const targetStep = ONBOARDING_STEP_ORDER[targetIndex];
    if (targetStep === 'complete-profile' && user?.mustChangePassword) return;
    setPwError(null);
    setProfileError(null);
    setStep(targetStep);
  };

  if (authLoading) return <AuthLayout><div /></AuthLayout>;

  // ── Change Password View ───────────────────────────────────────────────────
  if (step === 'change-password') {
    const cp = 'staffOnboarding.changePassword';
    return (
      <AuthLayout>
        <div className="space-y-4">
          <StepIndicator
            className="mx-1"
            steps={[
              { id: 'change-password', label: t('staffOnboarding.changePassword.title') },
              { id: 'complete-profile', label: t('staffOnboarding.completeProfile.title') },
            ]}
            currentIndex={currentStepIndex}
            onStepSelect={handleStepSelect}
            isStepEnabled={(index, indexCurrent) => index <= indexCurrent}
          />

          <Card className="auth-panel-card p-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{t(`${cp}.title`)}</h2>
            <p className="mt-1 text-sm text-gray-500">{t(`${cp}.subtitle`)}</p>

            {pwError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{pwError}</div>
            )}

            <div className="mt-6 space-y-4">
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                label={t(`${cp}.currentPasswordLabel`)}
                placeholder={t(`${cp}.currentPasswordPlaceholder`)}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                label={t(`${cp}.newPasswordLabel`)}
                placeholder={t(`${cp}.newPasswordPlaceholder`)}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                label={t(`${cp}.confirmPasswordLabel`)}
                placeholder={t(`${cp}.confirmPasswordPlaceholder`)}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            className="auth-cta-btn mt-6 w-full"
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(`${cp}.submitButton`)}
          </Button>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  // ── Complete Profile View ──────────────────────────────────────────────────
  const pp = 'staffOnboarding.completeProfile';
  return (
    <AuthLayout>
      <div className="space-y-4">
        <StepIndicator
          className="mx-1"
          steps={[
            { id: 'change-password', label: t('staffOnboarding.changePassword.title') },
            { id: 'complete-profile', label: t('staffOnboarding.completeProfile.title') },
          ]}
          currentIndex={currentStepIndex}
          onStepSelect={handleStepSelect}
          isStepEnabled={(index, indexCurrent) => index <= indexCurrent}
        />

        <Card className="auth-panel-card max-h-[85vh] overflow-y-auto p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{t(`${pp}.title`)}</h2>
          <p className="mt-1 text-sm text-gray-500">{t(`${pp}.subtitle`)}</p>

          {profileError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</div>
          )}

          <div className="mt-6 space-y-4">
          {/* Gender */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t(`${pp}.genderLabel`)}</label>
            <div className="flex gap-3">
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateField('gender', g)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    profile.gender === g
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(`${pp}.gender${g.charAt(0).toUpperCase() + g.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t(`${pp}.dobLabel`)}</label>
            <input
              type="date"
              value={profile.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500"
            />
          </div>

          {/* Phone */}
          <Input
            label={t(`${pp}.phoneLabel`)}
            placeholder={t(`${pp}.phonePlaceholder`)}
            value={profile.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />

          {/* Address */}
          <Input
            label={t(`${pp}.addressStreet`)}
            placeholder={t(`${pp}.streetPlaceholder`)}
            value={profile.addressStreet}
            onChange={(e) => updateField('addressStreet', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t(`${pp}.city`)}
              placeholder={t(`${pp}.cityPlaceholder`)}
              value={profile.addressCity}
              onChange={(e) => updateField('addressCity', e.target.value)}
            />
            <Input
              label={t(`${pp}.state`)}
              placeholder={t(`${pp}.statePlaceholder`)}
              value={profile.addressState}
              onChange={(e) => updateField('addressState', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t(`${pp}.country`)}
              placeholder={t(`${pp}.countryPlaceholder`)}
              value={profile.addressCountry}
              onChange={(e) => updateField('addressCountry', e.target.value)}
            />
            <Input
              label={t(`${pp}.postalCode`)}
              placeholder={t(`${pp}.postalCodePlaceholder`)}
              value={profile.addressPostalCode}
              onChange={(e) => updateField('addressPostalCode', e.target.value)}
            />
          </div>

          {/* Emergency Contact */}
          <h3 className="pt-2 text-base font-semibold text-gray-900">{t(`${pp}.emergencyTitle`)}</h3>
          <Input
            label={t(`${pp}.emergencyName`)}
            placeholder={t(`${pp}.emergencyNamePlaceholder`)}
            value={profile.emergencyContactName}
            onChange={(e) => updateField('emergencyContactName', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t(`${pp}.emergencyPhone`)}
              placeholder={t(`${pp}.emergencyPhonePlaceholder`)}
              value={profile.emergencyContactPhone}
              onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
            />
            <Input
              label={t(`${pp}.emergencyRelationship`)}
              placeholder={t(`${pp}.emergencyRelationshipPlaceholder`)}
              value={profile.emergencyContactRelationship}
              onChange={(e) => updateField('emergencyContactRelationship', e.target.value)}
            />
          </div>

          {/* National ID (conditional) */}
          {requirements.requireNationalId && (
            <Input
              label={t(`${pp}.nationalIdLabel`)}
              placeholder={t(`${pp}.nationalIdPlaceholder`)}
              value={profile.nationalId ?? ''}
              onChange={(e) => updateField('nationalId', e.target.value)}
            />
          )}
        </div>

          <Button
            className="auth-cta-btn mt-6 w-full"
            onClick={handleProfileSubmit}
            disabled={profileLoading}
          >
            {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(`${pp}.submitButton`)}
          </Button>
        </Card>
      </div>
    </AuthLayout>
  );
}
