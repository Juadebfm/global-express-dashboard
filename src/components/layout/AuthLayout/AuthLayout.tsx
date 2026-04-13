import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks';
import type { Language } from '@/store/language';
import { FlagIcon } from '@/components/ui';

const LANGUAGE_OPTIONS: { code: Language; flagCode: 'us' | 'kr'; label: string }[] = [
  { code: 'en', flagCode: 'us', label: 'English' },
  { code: 'ko', flagCode: 'kr', label: '한국어' },
];

const AUTH_HERO_IMAGES = ['/images/signin-air-transport.jpg', '/images/signin-sea-transport.jpg'];
const HERO_SLIDE_INTERVAL_MS = 10000;

function getSyncedHeroIndex(): number {
  return Math.floor(Date.now() / HERO_SLIDE_INTERVAL_MS) % AUTH_HERO_IMAGES.length;
}

interface AuthLayoutProps {
  children: ReactNode;
  rightClassName?: string;
  contentClassName?: string;
}

export function AuthLayout({ children, rightClassName, contentClassName }: AuthLayoutProps): ReactElement {
  const { t } = useTranslation('auth');
  const { language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(getSyncedHeroIndex);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!langRef.current?.contains(event.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [langOpen]);

  useEffect(() => {
    let intervalId: number | null = null;
    const syncIndex = () => setActiveHeroIndex(getSyncedHeroIndex());

    const remainingToBoundary = HERO_SLIDE_INTERVAL_MS - (Date.now() % HERO_SLIDE_INTERVAL_MS);
    const timeoutId = window.setTimeout(() => {
      syncIndex();
      intervalId = window.setInterval(syncIndex, HERO_SLIDE_INTERVAL_MS);
    }, remainingToBoundary);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Transport hero with overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {AUTH_HERO_IMAGES.map((imageUrl, index) => (
          <div
            key={imageUrl}
            className={`absolute inset-0 bg-gray-800 transition-opacity duration-700 ease-in-out ${
              index === activeHeroIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('${imageUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}

        {/* Layered overlays for readable copy on varied photos */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="absolute left-12 top-10 z-10">
          <img
            src="/images/mainlogo.svg"
            alt="GlobalXpress"
            className="h-10 w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Quote overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="max-w-md rounded-xl bg-black/45 p-6 shadow-xl backdrop-blur-[2px] border border-white/15">
            <blockquote className="text-xl font-semibold italic text-white drop-shadow-md">
              "{t('authLayout.quote')}"
            </blockquote>
            <p className="mt-4 text-white/90 drop-shadow-sm">
              {t('authLayout.quoteSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form content */}
      <div className={`w-full lg:w-1/2 flex items-start justify-center p-4 sm:p-6 lg:p-10 relative ${rightClassName ?? 'bg-[#F3F4F6]'}`}>
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

        <div className={`w-full ${contentClassName ?? 'max-w-2xl'}`}>
          {children}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-[11px] uppercase tracking-[0.18em] text-gray-400">
            <span>Privacy Policy</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
            <span>Terms of Service</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
