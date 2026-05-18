import { apiGet, apiPost } from '@/lib/apiClient';
import type {
  MfaStatus,
  MfaEnrollmentSecret,
  MfaEnrollmentResult,
  MfaDisableResult,
  MfaRecoveryCodesResult,
  MfaVerifyPayload,
  MfaRecoveryPayload,
  MfaDisablePayload,
  MfaRecoveryResult,
  AuthResponse,
} from '@/types';

// ── Challenge endpoints (unauth, mfaToken-bearing) ───────────────────────────

export async function verifyMfaChallenge(payload: MfaVerifyPayload): Promise<AuthResponse> {
  // Spec: POST /api/v1/auth/mfa/verify returns legacy flat shape
  //   { user, tokens: { accessToken } }
  const response = await apiPost<{ user: AuthResponse['user']; tokens: { accessToken: string } }>(
    '/auth/mfa/verify',
    payload,
  );
  return { user: response.user, token: response.tokens.accessToken };
}

export async function recoverWithMfaRecoveryCode(
  payload: MfaRecoveryPayload,
): Promise<MfaRecoveryResult> {
  const response = await apiPost<MfaRecoveryResult>('/auth/mfa/recovery', payload);
  return response;
}

// ── Internal enrollment endpoints (Bearer-authed) ────────────────────────────

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getMfaStatus(token: string): Promise<MfaStatus> {
  const response = await apiGet<Envelope<MfaStatus>>('/internal/me/mfa/status', token);
  return response.data;
}

export async function enrollMfa(token: string): Promise<MfaEnrollmentSecret> {
  const response = await apiPost<Envelope<MfaEnrollmentSecret>>(
    '/internal/me/mfa/enroll',
    {},
    token,
  );
  return response.data;
}

export async function verifyMfaEnrollment(
  token: string,
  code: string,
): Promise<MfaEnrollmentResult> {
  const response = await apiPost<Envelope<MfaEnrollmentResult>>(
    '/internal/me/mfa/verify-enrollment',
    { code },
    token,
  );
  return response.data;
}

export async function disableMfa(
  token: string,
  payload: MfaDisablePayload,
): Promise<MfaDisableResult> {
  const response = await apiPost<Envelope<MfaDisableResult>>(
    '/internal/me/mfa/disable',
    payload,
    token,
  );
  return response.data;
}

export async function regenerateRecoveryCodes(
  token: string,
  code: string,
): Promise<MfaRecoveryCodesResult> {
  const response = await apiPost<Envelope<MfaRecoveryCodesResult>>(
    '/internal/me/mfa/recovery-codes/regenerate',
    { code },
    token,
  );
  return response.data;
}
