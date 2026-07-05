import type { Lead, LeadsListResult } from '@/types';
import { apiGetData, apiPatchData, apiPostData, apiDelete } from '@/lib/apiClient';

export function listLeads(
  token: string,
  params: {
    page?: number;
    limit?: number;
    leadType?: 'd2d_intake' | 'shop_inquiry';
    status?: 'new' | 'contacted' | 'converted' | 'closed';
  } = {},
): Promise<LeadsListResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.leadType) qs.set('leadType', params.leadType);
  if (params.status) qs.set('status', params.status);
  return apiGetData<LeadsListResult>(`/leads?${qs.toString()}`, token);
}

export function getLead(id: string, token: string): Promise<Lead> {
  return apiGetData<Lead>(`/leads/${id}`, token);
}

export function updateLead(
  id: string,
  patch: {
    status?: 'new' | 'contacted' | 'converted' | 'closed';
    assignedTo?: string | null;
    message?: string;
  },
  token: string,
): Promise<Lead> {
  return apiPatchData<Lead>(`/leads/${id}`, patch, token);
}

export function deleteLead(id: string, token: string): Promise<void> {
  return apiDelete<void>(`/leads/${id}`, token);
}

export function getMyD2dLeads(token: string): Promise<Lead[]> {
  return apiGetData<Lead[]>('/leads/my-d2d', token);
}

export function submitD2dIntake(
  payload: {
    fullName: string;
    email?: string;
    phone?: string;
    originCountry: string;
    goodsDescription: string;
    estimatedWeightKg?: number;
    estimatedCbm?: number;
    deliveryPhone?: string;
    deliveryAddressLine1?: string;
    deliveryState?: string;
    deliveryCity?: string;
    deliveryLandmark?: string;
  },
  token: string,
): Promise<Lead> {
  return apiPostData<Lead>('/leads/d2d-intake', payload, token);
}

export function submitShopInquiry(
  payload: {
    fullName: string;
    phone?: string;
    email?: string;
    message: string;
    itemId?: string;
  },
  token: string,
): Promise<Lead> {
  return apiPostData<Lead>('/leads/shop-inquiry', payload, token);
}
