import type { AuthResponse, LoginCredentials, RegisterData, User } from '@/types';
import { mockUsers, mockPasswords } from './mockUsers';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateToken = (): string =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

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
