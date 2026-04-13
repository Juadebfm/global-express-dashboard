import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Globe2, Package, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { LAUNCH_GATE_TARGET_UTC, ROUTES, isLaunchGateActive } from '@/constants';

function getRemainingMs(): number {
  return Math.max(0, LAUNCH_GATE_TARGET_UTC - Date.now());
}

function toCountdownParts(remainingMs: number): { label: string; value: string }[] {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Minutes', value: String(minutes).padStart(2, '0') },
    { label: 'Seconds', value: String(seconds).padStart(2, '0') },
  ];
}

interface CountdownLandingProps {
  remainingMs: number;
}

function CountdownLanding({ remainingMs }: CountdownLandingProps): ReactElement {
  const countdownParts = useMemo(
    () => toCountdownParts(remainingMs),
    [remainingMs],
  );

  return (
    <AuthLayout rightClassName="bg-white" contentClassName="max-w-xl lg:max-w-2xl">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl sm:p-8 lg:p-10">
        <div className="flex justify-center">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-9 sm:h-11" />
        </div>

        <div className="mt-5 text-center sm:mt-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-medium tracking-wide text-brand-700 sm:text-xs">
            <Globe2 className="h-3 w-3 text-brand-600 sm:h-3.5 sm:w-3.5" />
            Global Pre-Launch Access
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:mt-4 sm:text-3xl">
            Final Security Checks In Progress
          </h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-[15px]">
            We are running final security checks before GlobalXpress goes live.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Launch target: Saturday, April 18, 2026 at 00:00 UTC.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-8 sm:grid-cols-4 sm:gap-x-8">
          {countdownParts.map((part) => (
            <div
              key={part.label}
              className="text-center"
            >
              <p className="font-display text-[30px] font-semibold leading-none text-gray-900 sm:text-[38px] lg:text-[46px]">
                {part.value}
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 sm:mt-3 sm:tracking-[0.25em]">
                {part.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}

function DefaultLanding(): ReactElement {
  const { t } = useTranslation('auth');

  return (
    <AuthLayout rightClassName="bg-white">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-2">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('landing.title')}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('landing.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to={ROUTES.SIGN_IN}
            className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Package className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('landing.customerPortal')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('landing.customerPortalDesc')}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:text-brand-500 group-hover:translate-x-1" />
          </Link>

          <Link
            to={ROUTES.LOGIN}
            className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <ShieldCheck className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('landing.staffLogin')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('landing.staffLoginDesc')}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:text-brand-500 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            {t('landing.newCustomer')}{' '}
            <Link
              to={ROUTES.SIGN_UP}
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              {t('landing.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export function LandingPage(): ReactElement {
  const [remainingMs, setRemainingMs] = useState<number>(() => getRemainingMs());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextRemaining = getRemainingMs();
      setRemainingMs(nextRemaining);

      if (nextRemaining === 0) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (isLaunchGateActive()) {
    return <CountdownLanding remainingMs={remainingMs} />;
  }

  return <DefaultLanding />;
}
