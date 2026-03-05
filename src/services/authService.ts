import type {
  AuthResponse,
  LoginCredentials,
  User,
  CustomerProfile,
  ApiCustomerProfileResponse,
  ApiProfileCompletenessResponse,
  ProfileCompleteness,
  ApiNotificationPreferencesResponse,
  NotificationPreferences,
  NotificationPreferencesUpdateInput,
  AccountExportFile,
  ChangePasswordPayload,
  AdminResetPasswordPayload,
  CreateInternalUserPayload,
  StaffProfilePayload,
  ProfileRequirements,
} from '@/types';
import { apiDelete, apiGet, apiGetBlob, apiPatch, apiPost } from '@/lib/apiClient';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiPost<{ success: boolean; data: AuthResponse }>(
    '/internal/auth/login',
    {
      email: credentials.email,
      password: credentials.password,
    },
  );
  return response.data;
}

export async function getMe(token: string): Promise<User> {
  // The response may be wrapped in { success, data: User } or returned directly
  // depending on the auth type (Clerk vs internal JWT).
  const response = await apiGet<Record<string, unknown>>('/auth/me', token);
  const user = (response?.data ?? response) as User;
  return user;
}

export function logout(token: string): Promise<void> {
  return apiPost<void>('/auth/logout', {}, token);
}

export async function syncClerkAccount(token: string): Promise<void> {
  await apiPost('/auth/sync', {}, token);
}

export async function getMyProfile(token: string): Promise<CustomerProfile> {
  const response = await apiGet<ApiCustomerProfileResponse>('/users/me', token);
  return response.data;
}

export async function getMyProfileCompleteness(token: string): Promise<ProfileCompleteness> {
  const response = await apiGet<ApiProfileCompletenessResponse>('/users/me/completeness', token);
  const payload = response.data;

  if (typeof payload === 'boolean') {
    return {
      isComplete: payload,
      missingFields: [],
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      isComplete: false,
      missingFields: [],
    };
  }

  const isComplete =
    payload.isComplete ??
    payload.isProfileComplete ??
    payload.complete ??
    payload.profileComplete ??
    false;

  return {
    isComplete: Boolean(isComplete),
    missingFields: Array.isArray(payload.missingFields) ? payload.missingFields : [],
  };
}

export async function getMyNotificationPreferences(
  token: string
): Promise<NotificationPreferences> {
  const response = await apiGet<ApiNotificationPreferencesResponse>(
    '/users/me/notification-preferences',
    token
  );

  const data = response.data;
  return {
    channels: {
      notifyEmailAlerts: data?.notifyEmailAlerts ?? false,
      notifySmsAlerts: data?.notifySmsAlerts ?? false,
      notifyInAppAlerts: data?.notifyInAppAlerts ?? false,
      consentMarketing: data?.consentMarketing ?? false,
    },
  };
}

export async function updateMyNotificationPreferences(
  token: string,
  input: NotificationPreferencesUpdateInput
): Promise<NotificationPreferences> {
  const response = await apiPatch<ApiNotificationPreferencesResponse>(
    '/users/me/notification-preferences',
    input,
    token
  );

  const data = response.data;
  return {
    channels: {
      notifyEmailAlerts: data?.notifyEmailAlerts ?? false,
      notifySmsAlerts: data?.notifySmsAlerts ?? false,
      notifyInAppAlerts: data?.notifyInAppAlerts ?? false,
      consentMarketing: data?.consentMarketing ?? false,
    },
  };
}

function getFilenameFromContentDisposition(
  headerValue: string | null,
  fallback: string
): string {
  if (!headerValue) return fallback;

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = headerValue.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = headerValue.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();

  return fallback;
}

export async function exportMyAccountData(token: string): Promise<AccountExportFile> {
  const { blob, headers } = await apiGetBlob('/users/me/export', token);
  const fallback = `globalexpress-account-export-${new Date().toISOString().slice(0, 10)}.pdf`;
  const filename = getFilenameFromContentDisposition(
    headers.get('content-disposition'),
    fallback
  );

  return {
    blob,
    filename,
    contentType: headers.get('content-type'),
  };
}

export async function updateMyProfile(
  token: string,
  data: Partial<CustomerProfile>
): Promise<CustomerProfile> {
  const response = await apiPatch<ApiCustomerProfileResponse>('/users/me', data, token);
  return response.data;
}

export async function deleteMyAccount(token: string): Promise<void> {
  await apiDelete('/users/me', token);
}

export async function changeMyPassword(
  token: string,
  payload: ChangePasswordPayload
): Promise<void> {
  await apiPatch('/internal/me/password', payload, token);
}

export async function adminResetPassword(
  token: string,
  userId: string,
  payload: AdminResetPasswordPayload
): Promise<void> {
  await apiPatch(`/internal/users/${userId}/password`, payload, token);
}

export async function createInternalUser(
  token: string,
  payload: CreateInternalUserPayload
): Promise<User> {
  const response = await apiPost<{ success: boolean; data: User }>('/internal/users', payload, token);
  return response.data;
}

export async function updateInternalProfile(
  token: string,
  payload: StaffProfilePayload
): Promise<void> {
  await apiPatch('/internal/me/profile', payload, token);
}

export async function getInternalProfileRequirements(
  token: string
): Promise<ProfileRequirements> {
  const response = await apiGet<{ success: boolean; data: ProfileRequirements }>(
    '/internal/me/profile-requirements',
    token
  );
  return response.data;
}

export async function getOnboardingSettings(
  token: string
): Promise<ProfileRequirements> {
  const response = await apiGet<{ success: boolean; data: ProfileRequirements }>(
    '/internal/settings/onboarding',
    token
  );
  return response.data;
}

export async function updateOnboardingSettings(
  token: string,
  payload: Partial<ProfileRequirements>
): Promise<ProfileRequirements> {
  const response = await apiPatch<{ success: boolean; data: ProfileRequirements }>(
    '/internal/settings/onboarding',
    payload,
    token
  );
  return response.data;
}
