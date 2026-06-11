import { apiGetData, apiPutData } from '@/lib/apiClient';

export type MeasurementCheckpoint = 'SK_WAREHOUSE' | 'AIRPORT' | 'NIGERIA_OFFICE';

export interface Measurement {
  checkpoint: MeasurementCheckpoint;
  measuredWeightKg: string;
  measuredCbm: string;
  deltaFromSkWeightKg: string | null;
  deltaFromSkCbm: string | null;
  measuredAt: string;
  notes: string | null;
}

export interface RecordMeasurementPayload {
  checkpoint: MeasurementCheckpoint;
  measuredWeightKg: number;
  measuredCbm: number;
  notes?: string;
}

export function getMeasurements(token: string, orderId: string): Promise<Measurement[]> {
  return apiGetData<Measurement[]>(`/shipments/${orderId}/measurements`, token);
}

export function recordMeasurement(
  token: string,
  orderId: string,
  payload: RecordMeasurementPayload,
): Promise<Measurement> {
  return apiPutData<Measurement>(`/shipments/${orderId}/measurements`, payload, token);
}
