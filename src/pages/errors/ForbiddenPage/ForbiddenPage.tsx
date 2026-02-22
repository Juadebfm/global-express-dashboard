import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks';

export function ForbiddenPage(): ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleBack = (): void => {
    navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <ShieldOff className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-3 text-sm text-gray-500">
          You don't have permission to view this page. If you think this is a
          mistake, contact your administrator.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            {isAuthenticated ? 'Back to Dashboard' : 'Go to Home'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
