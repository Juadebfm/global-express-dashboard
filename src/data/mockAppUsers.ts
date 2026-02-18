export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'issue' | 'locked';
  lastActive: string;
}

export const mockAppUsers: AppUser[] = [
  {
    id: 'user-1',
    fullName: 'Ngozi Eze',
    email: 'ngozi.eze@example.com',
    status: 'active',
    lastActive: '2026-02-16T09:12:00Z',
  },
  {
    id: 'user-2',
    fullName: 'Emeka Obi',
    email: 'emeka.obi@example.com',
    status: 'issue',
    lastActive: '2026-02-15T18:44:00Z',
  },
  {
    id: 'user-3',
    fullName: 'Zainab Hassan',
    email: 'zainab.hassan@example.com',
    status: 'active',
    lastActive: '2026-02-17T14:02:00Z',
  },
  {
    id: 'user-4',
    fullName: 'Ifeanyi Okoro',
    email: 'ifeanyi.okoro@example.com',
    status: 'locked',
    lastActive: '2026-02-12T11:26:00Z',
  },
  {
    id: 'user-5',
    fullName: 'Bisi Adekunle',
    email: 'bisi.adekunle@example.com',
    status: 'issue',
    lastActive: '2026-02-17T08:18:00Z',
  },
  {
    id: 'user-6',
    fullName: 'Chinedu Onu',
    email: 'chinedu.onu@example.com',
    status: 'active',
    lastActive: '2026-02-17T19:41:00Z',
  },
  {
    id: 'user-7',
    fullName: 'Halima Yusuf',
    email: 'halima.yusuf@example.com',
    status: 'active',
    lastActive: '2026-02-16T22:07:00Z',
  },
  {
    id: 'user-8',
    fullName: 'Abiola Adewale',
    email: 'abiola.adewale@example.com',
    status: 'issue',
    lastActive: '2026-02-14T06:32:00Z',
  },
];
