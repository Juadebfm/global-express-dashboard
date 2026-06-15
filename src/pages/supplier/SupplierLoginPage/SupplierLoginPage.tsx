import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout';
import { Button, Input, Card } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useSupplierAuthStore } from '@/store/supplierAuth';
import { supplierLogin, getSupplierMe } from '@/services/supplierPortalService';

export function SupplierLoginPage(): ReactElement {
  const navigate = useNavigate();
  const setAuth = useSupplierAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { accessToken, role } = await supplierLogin(email.trim(), password);

      if (role !== 'supplier') {
        setError('This portal is for suppliers only. Please use the correct login page.');
        return;
      }

      const user = await getSupplierMe(accessToken);
      setAuth(accessToken, user);
      navigate(ROUTES.SUPPLIER_DASHBOARD, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('locked') || msg.includes('423')) {
        setError('Your account has been locked after too many failed attempts. Please try again later.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="auth-panel-card p-8 sm:p-10">
        <div className="mb-6">
          <div className="mb-4 flex justify-center">
            <img src="/images/mainlogo.svg" alt="GlobalXpress" className="h-12" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Supplier login</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to manage your goods declarations.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPasswordToggle
            autoComplete="current-password"
          />

          <Button
            type="submit"
            className="auth-cta-btn w-full text-sm"
            size="lg"
            isLoading={isLoading}
          >
            Sign in
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
