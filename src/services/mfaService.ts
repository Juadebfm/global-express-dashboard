import { apiGetData, apiPost, apiPostData } from '@/lib/apiClient';
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
// These use the legacy auth/* flat shape — no { success, data } envelope —
// so they stay on the raw apiPost helper.

export async function verifyMfaChallenge(payload: MfaVerifyPayload): Promise<AuthResponse> {
  // Spec: POST /api/v1/auth/mfa/verify returns legacy flat shape
  //   { user, tokens: { accessToken } }
  const response = await apiPost<{ user: AuthResponse['user']; tokens: { accessToken: string } }>(
    '/auth/mfa/verify',
    payload,
  );
  return { user: response.user, token: response.tokens.accessToken };
}

export function recoverWithMfaRecoveryCode(
  payload: MfaRecoveryPayload,
): Promise<MfaRecoveryResult> {
  return apiPost<MfaRecoveryResult>('/auth/mfa/recovery', payload);
}

// ── Internal enrollment endpoints (Bearer-authed, enveloped) ─────────────────

export function getMfaStatus(token: string): Promise<MfaStatus> {
  return apiGetData<MfaStatus>('/internal/me/mfa/status', token);
}

export function enrollMfa(token: string): Promise<MfaEnrollmentSecret> {
  return apiPostData<MfaEnrollmentSecret>('/internal/me/mfa/enroll', {}, token);
}

export function verifyMfaEnrollment(
  token: string,
  code: string,
): Promise<MfaEnrollmentResult> {
  return apiPostData<MfaEnrollmentResult>(
    '/internal/me/mfa/verify-enrollment',
    { code },
    token,
  );
}

export function disableMfa(
  token: string,
  payload: MfaDisablePayload,
): Promise<MfaDisableResult> {
  return apiPostData<MfaDisableResult>('/internal/me/mfa/disable', payload, token);
}

export function regenerateRecoveryCodes(
  token: string,
  code: string,
): Promise<MfaRecoveryCodesResult> {
  return apiPostData<MfaRecoveryCodesResult>(
    '/internal/me/mfa/recovery-codes/regenerate',
    { code },
    token,
  );
}
