export interface ApiClientOrder {
  id: string;
  trackingNumber: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface ApiClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  isActive: boolean;
  totalShipments: number;
  totalSpent: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  orders?: ApiClientOrder[];
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
