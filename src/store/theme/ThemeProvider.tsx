import { useEffect, type ReactElement, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, useThemeStore } from './theme.store';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  return <>{children}</>;
}
