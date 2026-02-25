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
