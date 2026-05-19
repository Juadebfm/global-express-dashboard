import type { LoginFormData } from './LoginForm.schema';

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  /**
   * When set, the submit button is disabled and (if `lockoutCountdownLabel`
   * is also provided) a per-form lockout banner is shown. Used for HTTP 423
   * account lockouts where the user must wait for `lockedUntil`.
   */
  isLockedOut?: boolean;
  lockoutCountdownLabel?: string;
}
