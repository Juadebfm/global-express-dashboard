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
    staleTime: 5 * 60_000,
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
    staleTime: 5 * 60_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function useSubscribeToNewsletter(): {
  mutate: (payload: NewsletterSubscribePayload) => Promise<NewsletterSubscribeResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<NewsletterSubscribeResult, Error, NewsletterSubscribePayload>({
    mutationFn: (payload) => subscribeToNewsletter(payload),
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
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useSubmitPublicD2dIntake(): {
  mutate: (payload: PublicD2dIntakePayload) => Promise<PublicD2dIntakeResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<PublicD2dIntakeResult, Error, PublicD2dIntakePayload>({
    mutationFn: (payload) => submitPublicD2dIntake(payload),
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
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}
