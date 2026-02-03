import type { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: '0',
    email: 'superadmin@globalxpress.com',
    firstName: 'Sam',
    lastName: 'Superadmin',
    role: 'superadmin',
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
    id: '4',
    email: 'staff@globalxpress.com',
    firstName: 'Stacy',
    lastName: 'Staff',
    role: 'staff',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
];

export const mockPasswords: Record<string, string> = {
  'superadmin@globalxpress.com': 'superadmin123',
  'user@globalxpress.com': 'user1234',
  'staff@globalxpress.com': 'staff1234',
};
