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
} from '@/types';
import { apiDelete, apiGet, apiGetBlob, apiPatch, apiPost } from '@/lib/apiClient';

export function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/internal/auth/login', {
    email: credentials.email,
    password: credentials.password,
  });
}

export function getMe(token: string): Promise<User> {
  return apiGet<User>('/auth/me', token);
}

export function logout(token: string): Promise<void> {
  return apiPost<void>('/auth/logout', undefined, token);
}

export async function syncClerkAccount(token: string): Promise<void> {
  await apiPost('/auth/sync', undefined, token);
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

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const record = toRecord(value);
  if (!record) return null;

  const candidates = [
    record.enabled,
    record.isEnabled,
    record.active,
    record.isActive,
    record.value,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate;
  }
  return null;
}

function pickChannel(raw: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    if (!(key in raw)) continue;
    const value = toBoolean(raw[key]);
    if (value !== null) return value;
  }
  return null;
}

function mapNotificationPreferences(raw: Record<string, unknown>): NotificationPreferences {
  return {
    channels: {
      email: pickChannel(raw, ['email', 'emails']),
      sms: pickChannel(raw, ['sms', 'text', 'textMessages']),
      push: pickChannel(raw, ['push', 'pushNotifications']),
      inApp: pickChannel(raw, ['inApp', 'in_app', 'inAppNotifications']),
      whatsapp: pickChannel(raw, ['whatsapp', 'whatsApp']),
    },
    raw,
  };
}

export async function getMyNotificationPreferences(
  token: string
): Promise<NotificationPreferences> {
  const response = await apiGet<ApiNotificationPreferencesResponse>(
    '/users/me/notification-preferences',
    token
  );
  const raw = toRecord(response.data) ?? {};

  return mapNotificationPreferences(raw);
}

function buildNotificationPreferencesPayload(
  input: NotificationPreferencesUpdateInput
): Record<string, boolean> {
  const payload: Record<string, boolean> = {};

  if (typeof input.email === 'boolean') payload.email = input.email;
  if (typeof input.sms === 'boolean') payload.sms = input.sms;
  if (typeof input.push === 'boolean') payload.push = input.push;
  if (typeof input.whatsapp === 'boolean') payload.whatsapp = input.whatsapp;
  if (typeof input.inApp === 'boolean') {
    payload.inApp = input.inApp;
    payload.in_app = input.inApp;
  }

  return payload;
}

export async function updateMyNotificationPreferences(
  token: string,
  input: NotificationPreferencesUpdateInput
): Promise<NotificationPreferences | null> {
  const payload = buildNotificationPreferencesPayload(input);
  const response = await apiPatch<ApiNotificationPreferencesResponse>(
    '/users/me/notification-preferences',
    payload,
    token
  );

  const raw = toRecord(response.data);
  return raw ? mapNotificationPreferences(raw) : null;
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
  const fallback = `globalexpress-account-export-${new Date().toISOString().slice(0, 10)}.json`;
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
  return apiPost<User>('/internal/users', payload, token);
}
