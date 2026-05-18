import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMfaStatus,
  enrollMfa,
  verifyMfaEnrollment,
  disableMfa,
  regenerateRecoveryCodes,
  verifyMfaChallenge,
  recoverWithMfaRecoveryCode,
} from '@/services/mfaService';
import type {
  MfaStatus,
  MfaEnrollmentSecret,
  MfaEnrollmentResult,
  MfaDisableResult,
  MfaRecoveryCodesResult,
  MfaDisablePayload,
  MfaVerifyPayload,
  MfaRecoveryPayload,
  AuthResponse,
  MfaRecoveryResult,
} from '@/types';
import { useAuthToken } from './useAuthToken';

const MFA_STATUS_KEY = ['mfa', 'status'] as const;

// ── Settings-screen hooks (Bearer-authed) ────────────────────────────────────

export function useMfaStatus(): {
  data: MfaStatus | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery<MfaStatus>({
    queryKey: MFA_STATUS_KEY,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMfaStatus(token);
    },
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY }),
  };
}

export function useEnrollMfa(): {
  mutate: () => Promise<MfaEnrollmentSecret>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();

  const m = useMutation<MfaEnrollmentSecret, Error, void>({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return enrollMfa(token);
    },
  });

  return {
    mutate: () => m.mutateAsync(),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useVerifyMfaEnrollment(): {
  mutate: (code: string) => Promise<MfaEnrollmentResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<MfaEnrollmentResult, Error, string>({
    mutationFn: async (code) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return verifyMfaEnrollment(token, code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY });
    },
  });

  return {
    mutate: (code: string) => m.mutateAsync(code),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useDisableMfa(): {
  mutate: (payload: MfaDisablePayload) => Promise<MfaDisableResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<MfaDisableResult, Error, MfaDisablePayload>({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return disableMfa(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY });
    },
  });

  return {
    mutate: (payload) => m.mutateAsync(payload),
    isPending: m.isPending,
    error: m.error,
  };
}

export function useRegenerateRecoveryCodes(): {
  mutate: (code: string) => Promise<MfaRecoveryCodesResult>;
  isPending: boolean;
  error: Error | null;
} {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();

  const m = useMutation<MfaRecoveryCodesResult, Error, string>({
    mutationFn: async (code) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return regenerateRecoveryCodes(token, code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY });
    },
  });

  return {
    mutate: (code: string) => m.mutateAsync(code),
    isPending: m.isPending,
    error: m.error,
  };
}

// ── Login-time MFA challenge hooks (unauth, mfaToken-bearing) ────────────────

export function useMfaChallenge(): {
  verify: (payload: MfaVerifyPayload) => Promise<AuthResponse>;
  recover: (payload: MfaRecoveryPayload) => Promise<MfaRecoveryResult>;
  isVerifying: boolean;
  isRecovering: boolean;
  verifyError: Error | null;
  recoverError: Error | null;
} {
  const verifyMutation = useMutation<AuthResponse, Error, MfaVerifyPayload>({
    mutationFn: (payload) => verifyMfaChallenge(payload),
  });

  const recoverMutation = useMutation<MfaRecoveryResult, Error, MfaRecoveryPayload>({
    mutationFn: (payload) => recoverWithMfaRecoveryCode(payload),
  });

  return {
    verify: (payload) => verifyMutation.mutateAsync(payload),
    recover: (payload) => recoverMutation.mutateAsync(payload),
    isVerifying: verifyMutation.isPending,
    isRecovering: recoverMutation.isPending,
    verifyError: verifyMutation.error,
    recoverError: recoverMutation.error,
  };
}
