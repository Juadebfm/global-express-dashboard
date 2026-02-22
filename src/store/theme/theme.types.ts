export type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  mode: ThemeMode;
}

export interface ThemeStore extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}
