import type { ReactElement } from 'react';
import { LogOut, Package, TrendingUp, Users, Truck } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Button, Card } from '@/components/ui';

const stats = [
  { label: 'Active Shipments', value: '24', icon: Package, change: '+12%' },
  { label: 'Total Deliveries', value: '1,284', icon: Truck, change: '+8%' },
  { label: 'Customers', value: '156', icon: Users, change: '+3%' },
  { label: 'Revenue', value: '$48.2K', icon: TrendingUp, change: '+18%' },
];

export function DashboardPage(): ReactElement {
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-brand-500 font-display">
                GlobalXpress
              </h1>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName || 'User'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                rightIcon={<LogOut className="h-4 w-4" />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Good morning, {user?.firstName || 'User'}!
          </h2>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your shipments today.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className="p-3 bg-brand-50 rounded-lg">
                  <stat.icon className="h-6 w-6 text-brand-500" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Placeholder content */}
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Dashboard Content Coming Soon
          </h3>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            This is a placeholder dashboard. Additional features like shipment
            tracking, analytics, and customer management will be added here.
          </p>
        </Card>
      </main>
    </div>
  );
}
