// MFA contract mirrors backend Zod schemas. Source of truth:
// global-express-backend/API_ENDPOINTS.md §Auth, §Internal MFA.

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  userId: string;
}

export interface MfaStatus {
  enabled: boolean;
  enabledAt: string | null;
  remainingRecoveryCodes: number;
  isRequiredForRole: boolean;
}

export interface MfaEnrollmentSecret {
  secret: string;
  otpauthUri: string;
}

export interface MfaEnrollmentResult {
  enabled: true;
  recoveryCodes: string[];
  warning: string;
}

export interface MfaDisableResult {
  enabled: false;
}

export interface MfaRecoveryCodesResult {
  recoveryCodes: string[];
  warning: string;
}

export interface MfaVerifyPayload {
  mfaToken: string;
  code: string;
}

export interface MfaRecoveryPayload {
  mfaToken: string;
  recoveryCode: string;
}

export interface MfaDisablePayload {
  currentPassword: string;
  code: string;
}

export interface MfaRecoveryResult {
  user: import('./user.types').User;
  tokens: { accessToken: string };
  remainingRecoveryCodes: number;
}

// Login response — discriminated union
export type LoginOutcome =
  | { kind: 'success'; user: import('./user.types').User; token: string }
  | { kind: 'mfa_required'; mfaToken: string; userId: string };
