import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { verifyPayment } from '@/services/paymentsService';
import { ROUTES } from '@/constants';

const TOKEN_KEY = 'globalxpress_token';

export function PaymentCallbackPage(): ReactElement {
  const { t } = useTranslation('payments');
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }

    const verify = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) throw new Error('Not authenticated');
        await verifyPayment(token, reference);
        setStatus('success');
      } catch {
        setStatus('failed');
      }
    };

    verify();
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {status === 'verifying' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">{t('callback.verifying')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('callback.verifyingDesc')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-lg font-semibold text-green-700">{t('callback.success')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('callback.successDesc')}</p>
            <Link
              to={ROUTES.ORDERS}
              className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              {t('callback.viewOrders')}
            </Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <h1 className="text-lg font-semibold text-red-700">{t('callback.failed')}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('callback.failedDesc')}
            </p>
            <Link
              to={ROUTES.DASHBOARD}
              className="mt-6 inline-block rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              {t('callback.goToDashboard')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
