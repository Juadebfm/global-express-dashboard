export type Language = 'en' | 'ko';

export interface LanguageState {
  language: Language;
}

export interface LanguageStore extends LanguageState {
  setLanguage: (language: Language) => void;
  toggle: () => void;
}
