// Proof-of-payment receipts. Backend spec: §Payments
//   POST /payments/receipts/presign
//   POST /payments/receipts
//   PATCH /payments/receipts/:id/verify

export type ReceiptContentType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/webp';

export interface ReceiptPresignPayload {
  orderId: string;
  contentType: ReceiptContentType;
  originalFileName?: string;
}

export interface ReceiptPresignResponse {
  uploadUrl: string;
  r2Key: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export interface ReceiptSubmitPayload {
  orderId: string;
  amount: number;
  currency?: 'NGN';
  r2Key: string;
  referenceCode?: string;
  note?: string;
}

export interface ReceiptVerifyPayload {
  decision: 'approve' | 'reject';
  note?: string;
}

export interface ReceiptVerifyResult {
  warning: string | null;
}
