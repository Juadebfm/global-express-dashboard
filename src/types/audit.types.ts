export interface AuditLogActor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: AuditLogActor;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: AuditLogPagination;
}
