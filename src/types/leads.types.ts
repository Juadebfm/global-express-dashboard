export type LeadType = 'd2d_intake' | 'shop_inquiry';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface Lead {
  id: string;
  leadType: LeadType;
  status: LeadStatus;
  fullName: string;
  email: string | null;
  phone: string | null;
  originCountry: string | null;
  message: string | null;
  itemId: string | null;
  assignedTo: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResult {
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
}

export interface NewsletterSubscribersResult {
  data: NewsletterSubscriber[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
