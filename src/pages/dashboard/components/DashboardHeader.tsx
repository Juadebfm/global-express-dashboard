import type { ReactElement } from 'react';
import { Download, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import type { UiAction } from '@/types';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  actions: UiAction[];
}

const actionIconMap: Record<string, ReactElement> = {
  export: <Download className="h-4 w-4" />,
  tracking: <MapPin className="h-4 w-4" />,
  plus: <Plus className="h-4 w-4" />,
};

export function DashboardHeader({
  title,
  subtitle,
  actions,
}: DashboardHeaderProps): ReactElement {
  const renderAction = (action: UiAction): ReactElement => {
    const icon = actionIconMap[action.icon] ?? <Plus className="h-4 w-4" />;
    const isPrimary = action.id === 'newOrder';

    return (
      <Button
        key={action.id}
        type="button"
        size="sm"
        variant={isPrimary ? 'primary' : 'ghost'}
        leftIcon={icon}
        className={
          isPrimary
            ? 'bg-brand-500 text-white hover:bg-brand-600'
            : 'border border-brand-500 text-brand-500 hover:bg-brand-50'
        }
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions.map(renderAction)}
      </div>
    </div>
  );
}
