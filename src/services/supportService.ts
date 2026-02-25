import { apiGet, apiPost } from '@/lib/apiClient';
import type {
  SupportTicket,
  ApiSupportTicket,
  ApiSupportTicketsResponse,
  ApiCreateSupportTicketResponse,
  CreateSupportTicketPayload,
} from '@/types';

type TicketListPayload = ApiSupportTicketsResponse | ApiSupportTicket[];

function mapSupportTicket(ticket: ApiSupportTicket): SupportTicket {
  const fallbackTicketNumber = ticket.id ? `TKT-${ticket.id.slice(0, 8).toUpperCase()}` : 'TKT-UNKNOWN';

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber ?? fallbackTicketNumber,
    subject: ticket.subject,
    description: ticket.description ?? ticket.message ?? '',
    category: (ticket.category ?? 'other').toLowerCase(),
    priority: (ticket.priority ?? 'medium').toLowerCase(),
    status: (ticket.status ?? 'open').toLowerCase(),
    relatedTrackingNumber: ticket.relatedTrackingNumber ?? ticket.trackingNumber ?? null,
    requesterName: ticket.requesterName ?? ticket.createdByName ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt ?? ticket.createdAt,
  };
}

function extractTicketItems(payload: TicketListPayload): ApiSupportTicket[] {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.data)) return payload.data;

  return payload.data.data;
}

export async function getSupportTickets(token: string): Promise<SupportTicket[]> {
  const response = await apiGet<TicketListPayload>('/support/tickets', token);
  return extractTicketItems(response).map(mapSupportTicket);
}

export async function createSupportTicket(
  payload: CreateSupportTicketPayload,
  token: string
): Promise<SupportTicket> {
  const response = await apiPost<ApiCreateSupportTicketResponse>('/support/tickets', payload, token);
  return mapSupportTicket(response.data);
}
