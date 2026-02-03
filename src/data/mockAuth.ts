import type { AuthResponse, LoginCredentials, RegisterData, User } from '@/types';
import { mockUsers, mockPasswords } from './mockUsers';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateToken = (): string =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

// Store for OTP codes (in real app, this would be server-side)
const otpStore: Record<string, string> = {};

export async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  await delay(800);

  const user = mockUsers.find((u) => u.email === credentials.email);
  const password = mockPasswords[credentials.email];

  if (!user || password !== credentials.password) {
    throw new Error('Invalid email or password');
  }

  return {
    user,
    tokens: {
      accessToken: generateToken(),
      refreshToken: generateToken(),
    },
  };
}

export async function mockRegister(data: RegisterData): Promise<AuthResponse> {
  await delay(1000);

  const existingUser = mockUsers.find((u) => u.email === data.email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const newUser: User = {
    id: String(mockUsers.length + 1),
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);
  mockPasswords[data.email] = data.password;

  return {
    user: newUser,
    tokens: {
      accessToken: generateToken(),
      refreshToken: generateToken(),
    },
  };
}

export async function mockForgotPassword(email: string): Promise<{ message: string }> {
  await delay(600);

  const user = mockUsers.find((u) => u.email === email);
  if (!user) {
    throw new Error('Email not found');
  }

  return {
    message: 'Password reset email sent successfully',
  };
}

export async function mockSendOtp(email: string): Promise<{ message: string }> {
  await delay(600);

  const user = mockUsers.find((u) => u.email === email);
  if (!user) {
    throw new Error('Email not found');
  }

  // Generate a 4-digit OTP (in real app, this would be sent via email)
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  otpStore[email] = otp;

  // For development, log the OTP to console
  console.log(`[DEV] OTP for ${email}: ${otp}`);

  return {
    message: 'Verification code sent to your email',
  };
}

export async function mockVerifyOtp(
  email: string,
  otp: string
): Promise<{ message: string }> {
  await delay(500);

  const storedOtp = otpStore[email];

  // For development, accept any 4-digit code or the actual stored code
  if (otp.length !== 4) {
    throw new Error('Invalid verification code');
  }

  // In dev mode, accept any 4-digit code for easier testing
  // In production, you would strictly check: if (storedOtp !== otp)
  if (storedOtp && storedOtp !== otp) {
    // For easier testing, we'll accept any 4-digit code
    console.log(`[DEV] Expected OTP: ${storedOtp}, received: ${otp} - accepting for dev`);
  }

  return {
    message: 'Code verified successfully',
  };
}

export async function mockResetPassword(
  email: string,
  newPassword: string
): Promise<{ message: string }> {
  await delay(700);

  const user = mockUsers.find((u) => u.email === email);
  if (!user) {
    throw new Error('User not found');
  }

  // Update the password
  mockPasswords[email] = newPassword;

  // Clear the OTP
  delete otpStore[email];

  return {
    message: 'Password reset successfully',
  };
}

export async function mockGetCurrentUser(token: string): Promise<User> {
  await delay(300);

  if (!token) {
    throw new Error('No token provided');
  }

  return mockUsers[0];
}

export async function mockLogout(): Promise<void> {
  await delay(200);
}
