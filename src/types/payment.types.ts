export interface InitializePaymentPayload {
  orderId: string;
  amount: number;
  currency?: string;
  callbackUrl: string;
}

export interface PaystackInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface ApiPayment {
  id: string;
  orderId: string;
  userId: string;
  trackingNumber: string;
  amount: string;
  currency: string;
  paystackReference: string;
  proofReference: string | null;
  status: 'pending' | 'successful' | 'failed' | 'abandoned';
  paymentType: 'online' | 'transfer' | 'cash';
  paidAt: string | null;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordOfflinePayload {
  userId: string;
  amount: number;
  currency?: 'USD' | 'NGN';
  paymentType: 'transfer' | 'cash';
  proofReference?: string;
  note?: string;
}

export interface RecordOfflineResult {
  warning: string | null;
}

export interface WaiveBalancePayload {
  reason: string;
}

export interface ApiPaymentsResponse {
  success: boolean;
  data: {
    data: ApiPayment[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
