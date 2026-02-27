export interface BulkOrderItem {
  trackingNumber?: string;
  senderId?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress?: string;
  description?: string;
  weightKg?: number;
  declaredValue?: number;
}

export interface CreateBulkOrderPayload {
  origin: string;
  destination: string;
  notes?: string;
  items: BulkOrderItem[];
}

export interface ApiBulkOrderItem {
  id: string;
  trackingNumber: string;
  senderId?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress?: string;
  description?: string;
  weightKg?: number;
  declaredValue?: number;
  createdAt: string;
}

export interface ApiBulkOrder {
  id: string;
  origin: string;
  destination: string;
  notes?: string;
  statusV2: string;
  statusLabel: string;
  itemCount: number;
  items?: ApiBulkOrderItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBulkOrdersResponse {
  success: boolean;
  data: {
    data: ApiBulkOrder[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
