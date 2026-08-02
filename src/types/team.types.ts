// The Team list can return any internal account role. Creating or changing a
// role remains controlled by its own backend route and UI options.
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
  position: string | null;
  permissions: TeamPermissions;
  approvalStatus: 'approved' | 'pending';
}

export interface ApiTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  role: TeamRole;
  position: string | null;
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
