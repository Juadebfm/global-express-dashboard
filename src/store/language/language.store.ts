import { create } from 'zustand';
import type { Language, LanguageStore } from './language.types';

export const LANGUAGE_STORAGE_KEY = 'globalxpress_language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'ko') return stored;

  return navigator.language.startsWith('ko') ? 'ko' : 'en';
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (language) => {
    set({ language });
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  },
  toggle: () =>
    set((state) => {
      const next: Language = state.language === 'en' ? 'ko' : 'en';
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      return { language: next };
    }),
}));
