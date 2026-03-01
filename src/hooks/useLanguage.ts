import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/language';
import type { Language } from '@/store/language';
import { apiPatch } from '@/lib/apiClient';

const TOKEN_KEY = 'globalxpress_token';

export function useLanguage() {
  const store = useLanguageStore();
  const { i18n } = useTranslation();

  const setLanguage = useCallback(
    (lang: Language) => {
      store.setLanguage(lang);
      void i18n.changeLanguage(lang);

      // Best-effort sync to backend
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        void apiPatch('/users/me', { preferredLanguage: lang }, token).catch(() => {});
      }
    },
    [store, i18n],
  );

  return {
    language: store.language,
    setLanguage,
    toggle: store.toggle,
  };
}
