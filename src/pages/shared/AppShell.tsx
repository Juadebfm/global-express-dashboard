import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw } from 'lucide-react';
import type { DashboardData } from '@/types';
import { AppLayout } from '@/components/layout';
import { PageLoader } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';

interface AppShellProps {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  loadingLabel?: string;
  children: ReactNode;
}

export function AppShell({
  data,
  isLoading,
  error,
  loadingLabel = 'Loading...',
  children,
}: AppShellProps): ReactElement {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return <PageLoader label={loadingLabel} />;
  }

  if (!data || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <WifiOff className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{t('appShell.errorTitle')}</h1>
          <p className="mt-3 text-sm text-gray-500">
            {error ?? t('appShell.errorDefault')}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <RefreshCw className="h-4 w-4" />
              {t('appShell.tryAgain')}
            </button>
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME, { replace: true })}
              className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {isAuthenticated ? t('appShell.backToDashboard') : t('appShell.goToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout ui={data.ui} user={data.user}>
      {children}
    </AppLayout>
  );
}
