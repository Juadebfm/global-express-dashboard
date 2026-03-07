export interface BulkOrderItem {
  customerId?: string;
  recipientName: string;
  recipientAddress?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  description?: string;
  weight?: string;
  declaredValue?: string;
  pickupRepName?: string;
  pickupRepPhone?: string;
}

export interface CreateBulkOrderPayload {
  origin: string;
  destination: string;
  shipmentType: 'air' | 'sea' | 'ocean';
  notes?: string;
  items: BulkOrderItem[];
}

export interface ApiBulkOrderItem {
  id: string;
  trackingNumber: string;
  senderId?: string;
  customerId?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  description?: string;
  weight?: string | number;
  weightKg?: number;
  declaredValue?: string | number;
  pickupRepName?: string | null;
  pickupRepPhone?: string | null;
  statusV2?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiBulkOrder {
  id: string;
  origin: string;
  destination: string;
  notes?: string;
  statusV2: string;
  statusLabel?: string;
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
