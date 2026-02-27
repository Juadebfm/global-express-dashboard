import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyPayment } from '@/services/paymentsService';
import { ROUTES } from '@/constants';

const TOKEN_KEY = 'globalxpress_token';

export function PaymentCallbackPage(): ReactElement {
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
            <h1 className="text-lg font-semibold text-gray-900">Verifying Payment...</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-lg font-semibold text-green-700">Payment Successful</h1>
            <p className="mt-2 text-sm text-gray-500">Your payment has been confirmed.</p>
            <Link
              to={ROUTES.ORDERS}
              className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              View Orders
            </Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <h1 className="text-lg font-semibold text-red-700">Payment Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-500">
              We could not verify your payment. Please contact support if you were charged.
            </p>
            <Link
              to={ROUTES.DASHBOARD}
              className="mt-6 inline-block rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
