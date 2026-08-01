// The Team page creates and lists 'staff' and 'superadmin' only — the backend
// team routes constrain their role field to those two. 'admin' exists in the
// wider user_role enum (superadmin | admin | staff | user | supplier) and is
// assignable elsewhere, so don't treat this narrower union as the full set of
// internal roles; use InternalRole from permissions.types.ts for that.
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
