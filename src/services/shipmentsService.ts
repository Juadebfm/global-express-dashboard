import type { ShipmentsDashboardData } from '@/types';
import { mockShipmentsDashboard } from '@/data';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function getShipmentsDashboard(): Promise<ShipmentsDashboardData> {
  await delay(400);
  return mockShipmentsDashboard;
}
