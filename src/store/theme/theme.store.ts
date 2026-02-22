import { create } from 'zustand';
import type { ThemeMode, ThemeStore } from './theme.types';

export const THEME_STORAGE_KEY = 'globalxpress_theme';

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: getInitialMode(),
  setMode: (mode) => set({ mode }),
  toggle: () =>
    set((state) => ({
      mode: state.mode === 'dark' ? 'light' : 'dark',
    })),
}));
