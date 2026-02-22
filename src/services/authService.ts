import type { AuthResponse, LoginCredentials, User } from '@/types';
import { apiGet, apiPost } from '@/lib/apiClient';

export function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', {
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
