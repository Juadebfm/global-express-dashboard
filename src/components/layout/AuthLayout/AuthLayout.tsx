import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#031324]/82 via-[#031324]/62 to-[#031324]/38" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/32 to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 flex h-full items-center px-12 py-10 text-white">
          <div className="max-w-[560px]">
            <h1 className="text-6xl font-semibold leading-[1.06] tracking-tight text-white">
              Moving the world,
              <br />
              <span className="text-[#f8b49b]">one parcel</span> at a
              <br />
              time.
            </h1>
            <p className="mt-6 max-w-[520px] text-[19px] leading-relaxed text-white/88">
              Join the logistics network built for precision, speed, and global
              connectivity. Manage your entire supply chain from a single
              interface.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form content */}
      <div className={`w-full lg:w-1/2 relative flex min-h-screen flex-col ${rightClassName ?? 'bg-[#F3F4F6]'}`}>
        {/* Language toggle */}
        <div ref={langRef} className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => setLangOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition"
            aria-label="Change language"
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

        <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-16 sm:px-6 sm:pb-10 sm:pt-20 lg:px-10 lg:pb-12 lg:pt-24">
          <div className={`w-full ${contentClassName ?? 'max-w-[760px]'}`}>
            {children}
          </div>
        </div>

        <div className="mt-auto px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] uppercase tracking-[0.18em] text-gray-400">
            <a
              href="https://www.globalexpress.kr/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-gray-600"
            >
              Privacy Policy
            </a>
            <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
            <a
              href="https://www.globalexpress.kr/terms-and-conditions"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-gray-600"
            >
              Terms of Service
            </a>
            <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
