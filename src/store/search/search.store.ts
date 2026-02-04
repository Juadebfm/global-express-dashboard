import { create } from 'zustand';
import type { SearchStore } from './search.types';

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  setQuery: (value: string) => set({ query: value }),
  clear: () => set({ query: '' }),
}));
