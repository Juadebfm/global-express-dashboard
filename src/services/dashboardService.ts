import type { DashboardData } from '@/types';
import { mockDashboardData } from '@/data';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboardData(): Promise<DashboardData> {
  await delay(400);
  return mockDashboardData;
}
