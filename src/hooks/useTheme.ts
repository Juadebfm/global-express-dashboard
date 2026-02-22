import { useThemeStore } from '@/store';
import type { ThemeStore } from '@/store';

export function useTheme(): ThemeStore {
  return useThemeStore();
}
