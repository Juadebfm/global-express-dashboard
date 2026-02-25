export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'staff' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressPostalCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCustomerProfileResponse {
  success: boolean;
  message: string;
  data: CustomerProfile;
}

export interface ApiProfileCompletenessPayload {
  isComplete?: boolean;
  isProfileComplete?: boolean;
  complete?: boolean;
  profileComplete?: boolean;
  missingFields?: string[];
}

export interface ApiProfileCompletenessResponse {
  success: boolean;
  message: string;
  data: ApiProfileCompletenessPayload | boolean | null;
}

export interface ProfileCompleteness {
  isComplete: boolean;
  missingFields: string[];
}

export interface ApiNotificationPreferencesResponse {
  success: boolean;
  message: string;
  data: Record<string, unknown> | null;
}

export interface NotificationPreferenceChannels {
  email: boolean | null;
  sms: boolean | null;
  push: boolean | null;
  inApp: boolean | null;
  whatsapp: boolean | null;
}

export interface NotificationPreferences {
  channels: NotificationPreferenceChannels;
  raw: Record<string, unknown>;
}

export interface NotificationPreferencesUpdateInput {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
  whatsapp?: boolean;
}

export interface AccountExportFile {
  blob: Blob;
  filename: string;
  contentType: string | null;
}
