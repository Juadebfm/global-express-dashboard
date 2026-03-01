import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';

export function NotFoundPage(): ReactElement {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleHome = (): void => {
    navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <FileQuestion className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">{t('errors.notFound.title')}</h1>
        <p className="mt-3 text-sm text-gray-500">
          {t('errors.notFound.message')}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleHome}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            {isAuthenticated ? t('errors.notFound.backToDashboard') : t('errors.notFound.goToHome')}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t('errors.notFound.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
