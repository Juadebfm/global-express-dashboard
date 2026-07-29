// Backend only ever assigns 'staff' or 'superadmin' — there is no 'admin'
// role in the database (user_role enum: superadmin | staff | user | supplier).
export type TeamRole = 'staff' | 'superadmin';

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
  position?: string | null;
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
