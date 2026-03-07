import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { useAuth, useClients } from '@/hooks';
import { ROUTES } from '@/constants';
import {
  createOrder,
  estimateShippingCost,
  getMyProfileCompleteness,
  syncClerkAccount,
} from '@/services';
import type { ShippingEstimate } from '@/services';
import type { ShipmentFormState, ShipmentFormActions, StepDefinition } from './types';
import { STEP_KEYS } from './types';

const INTERNAL_TOKEN_KEY = 'globalxpress_token';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unable to verify profile completeness.';
}

export function useNewShipmentForm() {
  const { t } = useTranslation('shipments');
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const navigate = useNavigate();
  const { clients } = useClients();

  const isCustomer = !!isClerkSignedIn && !user;

  // Steps
  const steps: StepDefinition[] = STEP_KEYS.map((s) => ({
    id: s.id,
    label: t(s.labelKey),
    description: t(s.descKey),
  }));

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [shipmentType, setShipmentType] = useState('air');
  const [pickupDate, setPickupDate] = useState<Date | null>(new Date(Date.UTC(2026, 1, 20)));
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState('09:30');
  const [deliveryTime, setDeliveryTime] = useState('16:00');
  const [packageDescription, setPackageDescription] = useState('');
  const [packageWeightKg, setPackageWeightKg] = useState('');
  const [packageCbm, setPackageCbm] = useState('');
  const [packageDeclaredValue, setPackageDeclaredValue] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [usePickupRep, setUsePickupRep] = useState(false);
  const [pickupRepName, setPickupRepName] = useState('');
  const [pickupRepPhone, setPickupRepPhone] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Submission state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTrackingNumber, setCreatedTrackingNumber] = useState<string | null>(null);

  // Profile completeness check
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(false);
  const [completenessError, setCompletenessError] = useState<string | null>(null);

  // Estimate state
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  // Pre-fill recipient details from logged-in user profile
  useEffect(() => {
    if (recipientName || recipientEmail || recipientPhone) return;

    if (isCustomer && clerkUser) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
      if (name) setRecipientName(name);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) setRecipientEmail(email);
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber;
      if (phone) setRecipientPhone(phone);
    } else if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
      if (name) setRecipientName(name);
      if (user.email) setRecipientEmail(user.email);
    }
  }, [isCustomer, clerkUser, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Profile completeness check for customers
  useEffect(() => {
    if (!isCustomer) return;
    let isMounted = true;

    const checkCompleteness = async (): Promise<void> => {
      setIsCheckingCompleteness(true);
      setCompletenessError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication token is missing.');
        await syncClerkAccount(token);
        const completeness = await getMyProfileCompleteness(token);
        if (!completeness.isComplete && isMounted) {
          navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
        }
      } catch (checkError) {
        if (isMounted) setCompletenessError(getErrorMessage(checkError));
      } finally {
        if (isMounted) setIsCheckingCompleteness(false);
      }
    };

    void checkCompleteness();
    return () => { isMounted = false; };
  }, [getToken, isCustomer, navigate]);

  // Debounced shipping cost estimate
  const fetchEstimate = useCallback(async () => {
    const weightVal = parseFloat(packageWeightKg);
    const cbmVal = parseFloat(packageCbm);
    const hasAirInput = shipmentType === 'air' && Number.isFinite(weightVal) && weightVal > 0;
    const hasOceanInput = shipmentType === 'ocean' && Number.isFinite(cbmVal) && cbmVal > 0;

    if (!hasAirInput && !hasOceanInput) { setEstimate(null); return; }

    setEstimateLoading(true);
    try {
      const token = isCustomer
        ? await getToken()
        : localStorage.getItem(INTERNAL_TOKEN_KEY);
      const payload = shipmentType === 'air'
        ? { shipmentType: 'air' as const, weightKg: weightVal }
        : { shipmentType: 'ocean' as const, cbm: cbmVal };
      const result = await estimateShippingCost(payload, token ?? undefined);
      setEstimate(result);
    } catch {
      /* Silently ignore — estimate is non-critical */
    } finally {
      setEstimateLoading(false);
    }
  }, [shipmentType, packageWeightKg, packageCbm, isCustomer, getToken]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchEstimate(); }, 500);
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  // Validation
  const validateStep = useCallback((step: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!isCustomer && !selectedSenderId) {
        errors.selectedSenderId = t('newShipment.errors.senderRequired');
      }
    }

    if (step === 2) {
      if (!packageDescription.trim()) errors.packageDescription = t('newShipment.errors.descriptionRequired');
      if (shipmentType === 'air' && !packageWeightKg.trim()) errors.packageWeightKg = t('newShipment.errors.weightRequired');
      if (shipmentType === 'ocean' && !packageCbm.trim()) errors.packageCbm = t('newShipment.errors.volumeRequired');
      if (!packageDeclaredValue.trim()) errors.packageDeclaredValue = t('newShipment.errors.declaredValueRequired');
      if (!recipientName.trim()) errors.recipientName = t('newShipment.errors.nameRequired');
      if (!recipientEmail.trim()) {
        errors.recipientEmail = t('newShipment.errors.emailRequired');
      } else if (!EMAIL_RE.test(recipientEmail.trim())) {
        errors.recipientEmail = t('newShipment.errors.emailInvalid');
      }
      if (!recipientPhone.trim()) errors.recipientPhone = t('newShipment.errors.phoneRequired');
      if (usePickupRep && !pickupRepName.trim()) errors.pickupRepName = t('newShipment.errors.pickupRepRequired');
    }

    return errors;
  }, [isCustomer, selectedSenderId, packageDescription, shipmentType, packageWeightKg, packageCbm, packageDeclaredValue, recipientName, recipientEmail, recipientPhone, usePickupRep, pickupRepName, t]);

  const goNext = useCallback((): void => {
    const errors = validateStep(activeStep);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [activeStep, steps.length, validateStep]);

  const goPrevious = useCallback((): void => {
    setFieldErrors({});
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const getApiToken = useCallback(async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(INTERNAL_TOKEN_KEY);
  }, [isCustomer, getToken]);

  const handlePrimaryAction = useCallback(async (): Promise<void> => {
    if (activeStep < steps.length - 1) { goNext(); return; }

    setCreateError(null);

    const step0Errors = validateStep(0);
    if (Object.keys(step0Errors).length > 0) { setFieldErrors(step0Errors); setActiveStep(0); return; }

    const step2Errors = validateStep(2);
    if (Object.keys(step2Errors).length > 0) { setFieldErrors(step2Errors); setActiveStep(2); return; }

    setIsCreatingOrder(true);
    try {
      const token = await getApiToken();
      if (!token) throw new Error('Authentication token is missing.');

      const order = await createOrder(
        {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim(),
          orderDirection: 'outbound',
          weight: shipmentType === 'air' ? `${packageWeightKg.trim()}kg` : `${packageCbm.trim()}cbm`,
          declaredValue: packageDeclaredValue.trim(),
          description: packageDescription.trim(),
          shipmentType: shipmentType as 'air' | 'ocean',
          ...(selectedSenderId && { senderId: selectedSenderId }),
          ...(usePickupRep && pickupRepName.trim() && {
            pickupRepName: pickupRepName.trim(),
            pickupRepPhone: pickupRepPhone.trim() || undefined,
          }),
        },
        token,
      );

      setCreatedTrackingNumber(order.trackingNumber ?? null);
      setShowConfirmation(true);
    } catch (createOrderError) {
      const message = createOrderError instanceof Error
        ? createOrderError.message
        : t('newShipment.errors.failedToCreate');
      setCreateError(message);

      if (isCustomer && /profile/i.test(message)) {
        navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
      }
    } finally {
      setIsCreatingOrder(false);
    }
  }, [activeStep, steps.length, goNext, validateStep, getApiToken, recipientName, recipientPhone, recipientEmail, shipmentType, packageWeightKg, packageCbm, packageDeclaredValue, packageDescription, selectedSenderId, usePickupRep, pickupRepName, pickupRepPhone, t, isCustomer, navigate]);

  const formState: ShipmentFormState = {
    shipmentType, pickupDate, deliveryDate, pickupTime, deliveryTime,
    packageDescription, packageWeightKg, packageCbm, packageDeclaredValue,
    recipientName, recipientEmail, recipientPhone,
    usePickupRep, pickupRepName, pickupRepPhone, selectedSenderId,
  };

  const formActions: ShipmentFormActions = {
    setShipmentType, setPickupDate, setDeliveryDate, setPickupTime, setDeliveryTime,
    setPackageDescription, setPackageWeightKg, setPackageCbm, setPackageDeclaredValue,
    setRecipientName, setRecipientEmail, setRecipientPhone,
    setUsePickupRep, setPickupRepName, setPickupRepPhone, setSelectedSenderId,
  };

  return {
    // Steps
    steps, activeStep, progress,
    // Form
    formState, formActions, fieldErrors,
    // Navigation
    goNext, goPrevious, handlePrimaryAction,
    // Submission
    isCreatingOrder, createError, showConfirmation, setShowConfirmation, createdTrackingNumber,
    // Profile check
    isCheckingCompleteness, completenessError,
    // Estimate
    estimate, estimateLoading, fetchEstimate,
    // Auth
    isCustomer, clients,
  };
}

