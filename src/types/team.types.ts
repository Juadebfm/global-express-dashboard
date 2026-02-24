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

export interface ApiTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'admin' | 'superadmin';
  permissions: string[];
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTeamResponse {
  success: boolean;
  message: string;
  data: ApiTeamMember[];
}
