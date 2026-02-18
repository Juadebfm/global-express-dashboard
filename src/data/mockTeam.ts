export type TeamRole = 'staff' | 'admin' | 'superadmin';

export interface TeamPermissions {
  makeAdmin: boolean;
  canTransfer: boolean;
  viewOnly: boolean;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: TeamRole;
  permissions: TeamPermissions;
  approvalStatus: 'approved' | 'pending';
}

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'team-1',
    fullName: 'Amina Abdullahi',
    email: 'amina.abdullahi@globalxpress.com',
    role: 'superadmin',
    permissions: {
      makeAdmin: true,
      canTransfer: true,
      viewOnly: false,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-2',
    fullName: 'Tunde Adeyemi',
    email: 'tunde.adeyemi@globalxpress.com',
    role: 'admin',
    permissions: {
      makeAdmin: true,
      canTransfer: true,
      viewOnly: false,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-3',
    fullName: 'Chiamaka Nwosu',
    email: 'chiamaka.nwosu@globalxpress.com',
    role: 'staff',
    permissions: {
      makeAdmin: false,
      canTransfer: true,
      viewOnly: false,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-4',
    fullName: 'Ibrahim Musa',
    email: 'ibrahim.musa@globalxpress.com',
    role: 'staff',
    permissions: {
      makeAdmin: false,
      canTransfer: false,
      viewOnly: true,
    },
    approvalStatus: 'pending',
  },
  {
    id: 'team-5',
    fullName: 'Bolanle Adeoye',
    email: 'bolanle.adeoye@globalxpress.com',
    role: 'admin',
    permissions: {
      makeAdmin: true,
      canTransfer: true,
      viewOnly: false,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-6',
    fullName: 'Kelechi Okafor',
    email: 'kelechi.okafor@globalxpress.com',
    role: 'staff',
    permissions: {
      makeAdmin: false,
      canTransfer: false,
      viewOnly: true,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-7',
    fullName: 'Sade Afolabi',
    email: 'sade.afolabi@globalxpress.com',
    role: 'staff',
    permissions: {
      makeAdmin: false,
      canTransfer: true,
      viewOnly: true,
    },
    approvalStatus: 'approved',
  },
  {
    id: 'team-8',
    fullName: 'Uchechi Ezenwa',
    email: 'uchechi.ezenwa@globalxpress.com',
    role: 'staff',
    permissions: {
      makeAdmin: false,
      canTransfer: false,
      viewOnly: true,
    },
    approvalStatus: 'approved',
  },
];
