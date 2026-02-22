import { apiPost } from '@/lib/apiClient';

interface MessageResponse {
  message: string;
}

export function sendOtp(email: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password/send-otp', { email });
}

export function verifyOtp(email: string, otp: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password/verify-otp', { email, otp });
}

export function resetPassword(email: string, password: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password/reset', { email, password });
}
