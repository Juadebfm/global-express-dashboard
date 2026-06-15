import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { ROUTES } from '@/constants';

interface SupplierLayoutProps {
  children: ReactNode;
}

export function SupplierLayout({ children }: SupplierLayoutProps): ReactElement {
  const { user, clearAuth } = useSupplierAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to={ROUTES.SUPPLIER_DASHBOARD}>
              <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-6 shrink-0" />
            </Link>
            <span className="text-gray-300 select-none">|</span>
            <span className="text-sm font-medium text-gray-500 truncate">Supplier Portal</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user?.businessName && (
              <span className="hidden sm:block text-sm text-gray-600 font-medium truncate max-w-[180px]">
                {user.businessName}
              </span>
            )}
            <button
              type="button"
              onClick={clearAuth}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
