import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks';
import type { Language } from '@/store/language';
import { FlagIcon } from '@/components/ui';

const LANGUAGE_OPTIONS: { code: Language; flagCode: 'us' | 'kr'; label: string }[] = [
  { code: 'en', flagCode: 'us', label: 'English' },
  { code: 'ko', flagCode: 'kr', label: '한국어' },
];

interface AuthLayoutProps {
  children: ReactNode;
  rightClassName?: string;
}

export function AuthLayout({ children, rightClassName }: AuthLayoutProps): ReactElement {
  const { t } = useTranslation('auth');
  const { language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.dataset.theme;
    const prevColorScheme = root.style.colorScheme;
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
    return () => {
      if (prev) {
        root.dataset.theme = prev;
        root.style.colorScheme = prevColorScheme;
      }
    };
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!langRef.current?.contains(event.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [langOpen]);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Warehouse Image with overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-gray-800"
          style={{
            backgroundImage: `url('/images/signin-img.svg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Quote overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="max-w-md">
            <blockquote className="text-xl font-medium italic">
              "{t('authLayout.quote')}"
            </blockquote>
            <p className="mt-4 text-white/70">
              {t('authLayout.quoteSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form content */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 relative ${rightClassName ?? 'bg-brand-500'}`}>
        {/* Language toggle */}
        <div ref={langRef} className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => setLangOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition"
            aria-label={t('authLayout.changeLanguage')}
          >
            <FlagIcon code={LANGUAGE_OPTIONS.find((opt) => opt.code === language)?.flagCode ?? 'us'} size="sm" />
            <span>{language === 'ko' ? 'KR' : 'EN'}</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                    language === opt.code ? 'font-semibold text-brand-600' : 'text-gray-700'
                  }`}
                >
                  <FlagIcon code={opt.flagCode} size="sm" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
