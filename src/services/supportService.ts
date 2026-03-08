import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';
import type {
  SupportTicket,
  SupportMessage,
  ApiSupportTicket,
  ApiSupportMessage,
  ApiSupportTicketsResponse,
  ApiCreateSupportTicketResponse,
  ApiTicketDetailResponse,
  CreateSupportTicketPayload,
  SendSupportMessagePayload,
  UpdateTicketStatusPayload,
  SupportTicketListParams,
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

export function mapSupportMessage(msg: ApiSupportMessage): SupportMessage {
  return {
    id: msg.id,
    ticketId: msg.ticketId ?? msg.ticket_id ?? '',
    senderId: msg.senderId ?? msg.sender_id ?? '',
    senderName: msg.senderName ?? msg.sender_name ?? 'Unknown',
    senderRole: (msg.senderRole ?? msg.sender_role ?? 'customer') as SupportMessage['senderRole'],
    body: msg.body ?? msg.message ?? msg.content ?? '',
    isInternal: msg.isInternal ?? msg.is_internal ?? false,
    createdAt: msg.createdAt ?? msg.created_at ?? new Date().toISOString(),
  };
}

function extractTicketItems(payload: TicketListPayload): ApiSupportTicket[] {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.data)) return payload.data;

  return payload.data.data;
}

export async function getSupportTickets(
  token: string,
  params?: SupportTicketListParams,
): Promise<SupportTicket[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.assignedTo) searchParams.set('assignedTo', params.assignedTo);
  if (params?.userId) searchParams.set('userId', params.userId);
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  const response = await apiGet<TicketListPayload>(
    `/support/tickets${qs ? `?${qs}` : ''}`,
    token,
  );
  return extractTicketItems(response).map(mapSupportTicket);
}

export async function getSupportTicketById(
  ticketId: string,
  token: string,
): Promise<{ ticket: SupportTicket; messages: SupportMessage[] }> {
  const response = await apiGet<ApiTicketDetailResponse>(
    `/support/tickets/${ticketId}`,
    token,
  );
  return {
    ticket: mapSupportTicket(response.data.ticket),
    messages: response.data.messages.map(mapSupportMessage),
  };
}

export async function createSupportTicket(
  payload: CreateSupportTicketPayload,
  token: string,
): Promise<SupportTicket> {
  // Backend expects `body` instead of `description`
  const apiPayload = {
    subject: payload.subject,
    category: payload.category,
    priority: payload.priority,
    body: payload.description,
    relatedTrackingNumber: payload.relatedTrackingNumber,
  };
  const response = await apiPost<ApiCreateSupportTicketResponse>(
    '/support/tickets',
    apiPayload,
    token,
  );
  return mapSupportTicket(response.data);
}

export async function sendSupportMessage(
  ticketId: string,
  payload: SendSupportMessagePayload,
  token: string,
): Promise<SupportMessage> {
  const response = await apiPost<{ success: boolean; data: ApiSupportMessage }>(
    `/support/tickets/${ticketId}/messages`,
    payload,
    token,
  );
  return mapSupportMessage(response.data);
}

export async function updateTicketStatus(
  ticketId: string,
  payload: UpdateTicketStatusPayload,
  token: string,
): Promise<void> {
  await apiPatch(`/support/tickets/${ticketId}`, payload, token);
}
