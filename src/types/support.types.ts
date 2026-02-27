export type SupportTicketCategory =
  | 'shipment'
  | 'billing'
  | 'account'
  | 'technical'
  | 'other';

export type SupportTicketPriority = 'low' | 'medium' | 'high';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: SupportTicketCategory | string;
  priority: SupportTicketPriority | string;
  status: SupportTicketStatus | string;
  relatedTrackingNumber?: string | null;
  requesterName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  relatedTrackingNumber?: string;
}

export interface ApiSupportTicket {
  id: string;
  ticketNumber?: string;
  subject: string;
  description?: string;
  message?: string;
  category?: string;
  priority?: string;
  status?: string;
  relatedTrackingNumber?: string | null;
  trackingNumber?: string | null;
  requesterName?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiSupportTicketsResponse {
  success: boolean;
  message: string;
  data:
    | ApiSupportTicket[]
    | {
        data: ApiSupportTicket[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
}

export interface ApiCreateSupportTicketResponse {
  success: boolean;
  message: string;
  data: ApiSupportTicket;
}

// ── Chat message ────────────────────────────────────────────────

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'staff' | 'admin' | 'superadmin';
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ApiSupportMessage {
  id: string;
  ticketId?: string;
  ticket_id?: string;
  senderId?: string;
  sender_id?: string;
  senderName?: string;
  sender_name?: string;
  senderRole?: string;
  sender_role?: string;
  body?: string;
  message?: string;
  content?: string;
  isInternal?: boolean;
  is_internal?: boolean;
  createdAt: string;
  created_at?: string;
}

// ── Ticket detail (ticket + messages) ───────────────────────────

export interface ApiTicketDetailResponse {
  success: boolean;
  message?: string;
  data: {
    ticket: ApiSupportTicket;
    messages: ApiSupportMessage[];
  };
}

// ── Send message payload ────────────────────────────────────────

export interface SendSupportMessagePayload {
  body: string;
  isInternal?: boolean;
}

// ── Update ticket status ────────────────────────────────────────

export interface UpdateTicketStatusPayload {
  status: SupportTicketStatus;
}

// ── Ticket list query params (for staff) ────────────────────────

export interface SupportTicketListParams {
  status?: SupportTicketStatus;
  assignedTo?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

// ── WebSocket event payloads ────────────────────────────────────

export interface SupportWsMessageEvent {
  type: 'support:message';
  ticketId: string;
  message: ApiSupportMessage;
}

export interface SupportWsNewTicketEvent {
  type: 'support:new_ticket';
  ticket: ApiSupportTicket;
}
