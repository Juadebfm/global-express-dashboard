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
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  role: 'staff' | 'admin' | 'superadmin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTeamResponse {
  success: boolean;
  message: string;
  data: {
    data: ApiTeamMember[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
