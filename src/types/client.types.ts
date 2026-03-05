export interface ApiClientOrder {
  id: string;
  trackingNumber: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface ApiClient {
  id: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressPostalCode?: string;
  isActive: boolean;
  totalOrders: number;
  totalPayments: string;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: ApiClientOrder[];
}

export interface CreateClientPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
}

export interface ApiClientsResponse {
  success: boolean;
  message: string;
  data: {
    data: ApiClient[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
