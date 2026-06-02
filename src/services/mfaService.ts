import { apiGetData, apiPostData } from '@/lib/apiClient';
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
// As of the BE REST standards pass, /auth/mfa/* responses are wrapped in
// { success, data: T } like everything else. apiPostData unwraps once.

export async function verifyMfaChallenge(payload: MfaVerifyPayload): Promise<AuthResponse> {
  const data = await apiPostData<{
    user: AuthResponse['user'];
    tokens: { accessToken: string };
  }>('/auth/mfa/verify', payload);
  return { user: data.user, token: data.tokens.accessToken };
}

export function recoverWithMfaRecoveryCode(
  payload: MfaRecoveryPayload,
): Promise<MfaRecoveryResult> {
  return apiPostData<MfaRecoveryResult>('/auth/mfa/recovery', payload);
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
