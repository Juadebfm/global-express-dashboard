import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout';
import { ROUTES } from '@/constants';

export function LandingPage(): ReactElement {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-2">
          <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to GlobalXpress</h1>
          <p className="mt-2 text-sm text-gray-500">
            Choose how you'd like to continue.
          </p>
        </div>

        <div className="space-y-4">
          {/* Customer CTA */}
          <Link
            to={ROUTES.SIGN_IN}
            className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Package className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer Portal</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track shipments and manage your orders
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:text-brand-500 group-hover:translate-x-1" />
          </Link>

          {/* Staff / Operator CTA */}
          <Link
            to={ROUTES.LOGIN}
            className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <ShieldCheck className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Staff / Operator Login</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  For internal team members only
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:text-brand-500 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            New customer?{' '}
            <Link
              to={ROUTES.SIGN_UP}
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
