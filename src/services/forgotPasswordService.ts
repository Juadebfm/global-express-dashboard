import { apiPostData } from '@/lib/apiClient';

interface MessageResponse {
  message: string;
}

// BE wraps every /auth/* response in { success, data: T }. The three
// forgot-password endpoints return { message } inside `data`.

export function sendOtp(email: string): Promise<MessageResponse> {
  return apiPostData<MessageResponse>('/auth/forgot-password/send-otp', { email });
}

export function verifyOtp(email: string, otp: string): Promise<MessageResponse> {
  return apiPostData<MessageResponse>('/auth/forgot-password/verify-otp', { email, otp });
}

export function resetPassword(email: string, password: string): Promise<MessageResponse> {
  return apiPostData<MessageResponse>('/auth/forgot-password/reset', { email, password });
}
