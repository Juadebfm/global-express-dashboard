import { useMutation, useQuery } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import {
  getPublicCalculatorRates,
  getPublicShipmentTypes,
  submitPublicD2dIntake,
  subscribeToNewsletter,
} from '@/services/publicService';
import type {
  NewsletterSubscribePayload,
  NewsletterSubscribeResult,
  PublicCalculatorRates,
  PublicD2dIntakePayload,
  PublicD2dIntakeResult,
  PublicShipmentTypesResult,
} from '@/types';
import { STALE_TIME } from '@/lib/queryDefaults';

const publicShipmentTypesKey = ['public', 'shipment-types'] as const;
const publicRatesKey = ['public', 'calculator-rates'] as const;

export function usePublicShipmentTypes(): {
  data: PublicShipmentTypesResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<PublicShipmentTypesResult>({
    queryKey: publicShipmentTypesKey,
    queryFn: () => getPublicShipmentTypes(),
    staleTime: STALE_TIME.STATIC,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function usePublicCalculatorRates(): {
  data: PublicCalculatorRates | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<PublicCalculatorRates>({
    queryKey: publicRatesKey,
    queryFn: () => getPublicCalculatorRates(),
    staleTime: STALE_TIME.STATIC,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

// Mutation input bundles the user payload with the Turnstile token captured
// by the form's <TurnstileGate>. Tokens are single-use; the caller is
// responsible for asking the gate for a fresh one before each submit.

interface NewsletterSubscribeInput {
  payload: NewsletterSubscribePayload;
  turnstileToken: string;
}

export function useSubscribeToNewsletter(): {
  mutate: (input: NewsletterSubscribeInput) => Promise<NewsletterSubscribeResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<NewsletterSubscribeResult, Error, NewsletterSubscribeInput>({
    mutationFn: ({ payload, turnstileToken }) =>
      subscribeToNewsletter(payload, turnstileToken),
    onSuccess: () => {
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.public.newsletterSubscribeSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.public.newsletterSubscribeError,
      });
    },
  });
  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

interface SubmitPublicD2dIntakeInput {
  payload: PublicD2dIntakePayload;
  turnstileToken: string;
}

export function useSubmitPublicD2dIntake(): {
  mutate: (input: SubmitPublicD2dIntakeInput) => Promise<PublicD2dIntakeResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<PublicD2dIntakeResult, Error, SubmitPublicD2dIntakeInput>({
    mutationFn: ({ payload, turnstileToken }) =>
      submitPublicD2dIntake(payload, turnstileToken),
    onSuccess: () => {
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.public.d2dIntakeSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.public.d2dIntakeError,
      });
    },
  });
  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}
