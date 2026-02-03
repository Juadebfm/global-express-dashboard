import type { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@globalxpress.com',
    firstName: 'John',
    lastName: 'Admin',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'user@globalxpress.com',
    firstName: 'Jane',
    lastName: 'User',
    role: 'user',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    email: 'manager@globalxpress.com',
    firstName: 'Mike',
    lastName: 'Manager',
    role: 'manager',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
];

export const mockPasswords: Record<string, string> = {
  'admin@globalxpress.com': 'admin123',
  'user@globalxpress.com': 'user1234',
  'manager@globalxpress.com': 'manager1',
};
