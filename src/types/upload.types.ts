export interface PresignPayload {
  orderId: string;
  contentType: 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp';
}

export interface PresignResponse {
  uploadUrl: string;
  r2Key: string;
}

export interface ConfirmPayload {
  orderId: string;
  r2Key: string;
}

export interface OrderImage {
  id: string;
  orderId: string;
  r2Key: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
}
