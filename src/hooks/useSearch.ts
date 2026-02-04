import { useSearchStore } from '@/store';
import type { SearchStore } from '@/store';

export function useSearch(): SearchStore {
  return useSearchStore();
}
