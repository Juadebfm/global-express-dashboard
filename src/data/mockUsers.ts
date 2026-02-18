import type { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: '0',
    email: 'superadmin@globalxpress.com',
    firstName: 'Amina',
    lastName: 'Abdullahi',
    role: 'superadmin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'admin@globalxpress.com',
    firstName: 'Tunde',
    lastName: 'Adeyemi',
    role: 'admin',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '3',
    email: 'user@globalxpress.com',
    firstName: 'Ngozi',
    lastName: 'Eze',
    role: 'user',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    email: 'staff@globalxpress.com',
    firstName: 'Chinedu',
    lastName: 'Okoro',
    role: 'staff',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
];

export const mockPasswords: Record<string, string> = {
  'superadmin@globalxpress.com': 'superadmin123',
  'admin@globalxpress.com': 'admin1234',
  'user@globalxpress.com': 'user1234',
  'staff@globalxpress.com': 'staff1234',
};
