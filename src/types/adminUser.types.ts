export interface AdminUserListParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  preferredLanguage?: string;
}

export interface ChangeUserRolePayload {
  role: 'user' | 'staff' | 'admin' | 'superadmin';
}
