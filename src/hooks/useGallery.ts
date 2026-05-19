import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEEDBACK_MESSAGES } from '@/constants';
import { useFeedbackStore } from '@/store';
import {
  createGalleryAdvert,
  createGalleryItem,
  getAuthedGallery,
  getGalleryClaims,
  getPublicGallery,
  getPublicGalleryAdverts,
  getPublicGallerySales,
  presignGalleryClaim,
  presignGalleryItemMedia,
  presignPublicGalleryClaim,
  reviewGalleryClaim,
  submitAuthedAnonymousClaim,
  submitAuthedCarPurchaseAttempt,
  submitPublicAnonymousClaim,
  submitPublicCarPurchaseAttempt,
  updateGalleryAdvert,
  updateGalleryItem,
} from '@/services/galleryService';
import type {
  AnonymousCarPurchasePayload,
  AnonymousClaimPayload,
  AuthedCarPurchasePayload,
  AuthedClaimPayload,
  AuthedGalleryListings,
  GalleryAdvertCreatePayload,
  GalleryAdvertUpdatePayload,
  GalleryClaim,
  GalleryClaimReviewPayload,
  GalleryClaimReviewResult,
  GalleryClaimsQuery,
  GalleryClaimSubmissionResult,
  GalleryItem,
  GalleryItemCreatePayload,
  GalleryItemUpdatePayload,
  GalleryUploadPresignPayload,
  GalleryUploadPresignResult,
  PublicGalleryListings,
} from '@/types';
import { useAuthToken } from './useAuthToken';
import { useR2Upload } from './useR2Upload';

// ── Query keys ───────────────────────────────────────────────────────────────

const publicGalleryKey = (limit?: number): readonly unknown[] =>
  ['gallery', 'public', { limit: limit ?? 'default' }] as const;
const publicAdvertsKey = (limit?: number): readonly unknown[] =>
  ['gallery', 'public', 'adverts', { limit: limit ?? 'default' }] as const;
const publicSalesKey = (limit?: number): readonly unknown[] =>
  ['gallery', 'public', 'sales', { limit: limit ?? 'default' }] as const;
const authedGalleryKey = (limit?: number): readonly unknown[] =>
  ['gallery', 'authed', { limit: limit ?? 'default' }] as const;
const claimsKey = (query: GalleryClaimsQuery): readonly unknown[] =>
  ['gallery', 'claims', query] as const;

// ── Public reads (no token) ──────────────────────────────────────────────────

export function usePublicGallery(limitPerSection?: number): {
  data: PublicGalleryListings | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<PublicGalleryListings>({
    queryKey: publicGalleryKey(limitPerSection),
    queryFn: () => getPublicGallery(limitPerSection),
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function usePublicGalleryAdverts(limit?: number): {
  data: GalleryItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<GalleryItem[]>({
    queryKey: publicAdvertsKey(limit),
    queryFn: () => getPublicGalleryAdverts(limit),
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function usePublicGallerySales(limit?: number): {
  data: GalleryItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<GalleryItem[]>({
    queryKey: publicSalesKey(limit),
    queryFn: () => getPublicGallerySales(limit),
    staleTime: 60_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

// ── Public claim flow (anonymous) ────────────────────────────────────────────

export interface AnonymousClaimSubmissionInput {
  trackingNumber: string;
  files: File[];
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  message?: string;
  itemId: string;
}

export function useSubmitAnonymousClaim(): {
  mutate: (input: AnonymousClaimSubmissionInput) => Promise<GalleryClaimSubmissionResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();

  const m = useMutation<GalleryClaimSubmissionResult, Error, AnonymousClaimSubmissionInput>({
    mutationFn: async (input) => {
      if (input.files.length === 0) {
        throw new Error('Attach at least one proof document.');
      }
      let uploadToken: string | undefined;
      const r2Keys: string[] = [];
      for (const file of input.files) {
        const presign = await presignPublicGalleryClaim({
          uploadToken,
          contentType: file.type as GalleryUploadPresignPayload['contentType'],
          originalFileName: file.name,
        });
        uploadToken = presign.uploadToken;
        const putResp = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putResp.ok) {
          throw new Error(`Upload to storage failed (${putResp.status})`);
        }
        r2Keys.push(presign.r2Key);
      }
      if (!uploadToken) {
        throw new Error('Upload token missing — please retry.');
      }
      const payload: AnonymousClaimPayload = {
        itemId: input.itemId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        country: input.country,
        message: input.message,
        uploadToken,
        proofR2Keys: r2Keys,
      };
      return submitPublicAnonymousClaim(input.trackingNumber, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', 'public'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.claimSubmitSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.claimSubmitError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useSubmitPublicCarPurchase(): {
  mutate: (input: {
    trackingNumber: string;
    payload: AnonymousCarPurchasePayload;
  }) => Promise<GalleryClaimSubmissionResult>;
  isPending: boolean;
  error: Error | null;
} {
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();
  const m = useMutation<
    GalleryClaimSubmissionResult,
    Error,
    { trackingNumber: string; payload: AnonymousCarPurchasePayload }
  >({
    mutationFn: ({ trackingNumber, payload }) =>
      submitPublicCarPurchaseAttempt(trackingNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', 'public'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.carPurchaseSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.carPurchaseError,
      });
    },
  });
  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

// ── Authed gallery (signed-in users) ─────────────────────────────────────────

export function useAuthedGallery(limitPerSection?: number): {
  data: AuthedGalleryListings | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const query = useQuery<AuthedGalleryListings>({
    queryKey: authedGalleryKey(limitPerSection),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAuthedGallery(token, limitPerSection);
    },
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

export function useSubmitAuthedClaim(): {
  mutate: (input: {
    trackingNumber: string;
    files: File[];
    itemId: string;
    message?: string;
  }) => Promise<GalleryClaimSubmissionResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();

  const m = useMutation<
    GalleryClaimSubmissionResult,
    Error,
    { trackingNumber: string; files: File[]; itemId: string; message?: string }
  >({
    mutationFn: async ({ trackingNumber, files, itemId, message }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (files.length === 0) throw new Error('Attach at least one proof document.');

      let uploadToken: string | undefined;
      const r2Keys: string[] = [];
      for (const file of files) {
        const presign = await presignGalleryClaim(token, {
          uploadToken,
          contentType: file.type as GalleryUploadPresignPayload['contentType'],
          originalFileName: file.name,
        });
        uploadToken = presign.uploadToken;
        const putResp = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putResp.ok) {
          throw new Error(`Upload to storage failed (${putResp.status})`);
        }
        r2Keys.push(presign.r2Key);
      }
      if (!uploadToken) throw new Error('Upload token missing — please retry.');

      const payload: AuthedClaimPayload = {
        itemId,
        message,
        uploadToken,
        proofR2Keys: r2Keys,
      };
      return submitAuthedAnonymousClaim(token, trackingNumber, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.claimSubmitSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.claimSubmitError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useSubmitAuthedCarPurchase(): {
  mutate: (input: {
    trackingNumber: string;
    payload: AuthedCarPurchasePayload;
  }) => Promise<GalleryClaimSubmissionResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const queryClient = useQueryClient();

  const m = useMutation<
    GalleryClaimSubmissionResult,
    Error,
    { trackingNumber: string; payload: AuthedCarPurchasePayload }
  >({
    mutationFn: async ({ trackingNumber, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return submitAuthedCarPurchaseAttempt(token, trackingNumber, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.carPurchaseSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.carPurchaseError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

// ── Staff mutations ──────────────────────────────────────────────────────────

export interface UploadGalleryMediaInput {
  file: Blob;
  contentType: GalleryUploadPresignPayload['contentType'];
  originalFileName?: string;
  uploadToken?: string;
}

export function useUploadGalleryItemMedia(): {
  mutate: (input: UploadGalleryMediaInput) => Promise<GalleryUploadPresignResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const upload = useR2Upload();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<GalleryUploadPresignResult, Error, UploadGalleryMediaInput>({
    mutationFn: async ({ file, contentType, originalFileName, uploadToken }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return upload({
        file,
        contentType,
        presign: () =>
          presignGalleryItemMedia(token, {
            uploadToken,
            contentType,
            originalFileName,
          }),
        getUploadUrl: (r) => r.uploadUrl,
        // No confirm endpoint for gallery media — the presign result itself is
        // the durable record. Return it so callers can capture the publicUrl.
        confirm: (r) => Promise.resolve(r),
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.mediaUploadError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useCreateGalleryItem(): {
  mutate: (payload: GalleryItemCreatePayload) => Promise<GalleryItem>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<GalleryItem, Error, GalleryItemCreatePayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createGalleryItem(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.itemCreateSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.itemCreateError,
      });
    },
  });
  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useCreateGalleryAdvert(): {
  mutate: (payload: GalleryAdvertCreatePayload) => Promise<GalleryItem>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<GalleryItem, Error, GalleryAdvertCreatePayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createGalleryAdvert(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.advertCreateSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.advertCreateError,
      });
    },
  });
  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUpdateGalleryItem(): {
  mutate: (input: { itemId: string; payload: GalleryItemUpdatePayload }) => Promise<GalleryItem>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<
    GalleryItem,
    Error,
    { itemId: string; payload: GalleryItemUpdatePayload }
  >({
    mutationFn: async ({ itemId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateGalleryItem(token, itemId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.itemUpdateSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.itemUpdateError,
      });
    },
  });
  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useUpdateGalleryAdvert(): {
  mutate: (input: { itemId: string; payload: GalleryAdvertUpdatePayload }) => Promise<GalleryItem>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);
  const m = useMutation<
    GalleryItem,
    Error,
    { itemId: string; payload: GalleryAdvertUpdatePayload }
  >({
    mutationFn: async ({ itemId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateGalleryAdvert(token, itemId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      pushMessage({
        tone: 'success',
        message: FEEDBACK_MESSAGES.gallery.advertUpdateSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.advertUpdateError,
      });
    },
  });
  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}

// ── Staff claim review ───────────────────────────────────────────────────────

export function useGalleryClaims(query: GalleryClaimsQuery = {}): {
  data: GalleryClaim[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const q = useQuery<GalleryClaim[]>({
    queryKey: claimsKey(query),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getGalleryClaims(token, query);
    },
    staleTime: 15_000,
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}

export function useReviewGalleryClaim(): {
  mutate: (input: {
    claimId: string;
    payload: GalleryClaimReviewPayload;
  }) => Promise<GalleryClaimReviewResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  const pushMessage = useFeedbackStore((s) => s.pushMessage);

  const m = useMutation<
    GalleryClaimReviewResult,
    Error,
    { claimId: string; payload: GalleryClaimReviewPayload }
  >({
    mutationFn: async ({ claimId, payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return reviewGalleryClaim(token, claimId, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      const isApprove = variables.payload.decision === 'approve';
      pushMessage({
        tone: 'success',
        message: isApprove
          ? FEEDBACK_MESSAGES.gallery.claimReviewApproveSuccess
          : FEEDBACK_MESSAGES.gallery.claimReviewRejectSuccess,
      });
    },
    onError: (err) => {
      pushMessage({
        tone: 'error',
        message: err.message || FEEDBACK_MESSAGES.gallery.claimReviewError,
      });
    },
  });

  return {
    mutate: (input) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
  };
}
