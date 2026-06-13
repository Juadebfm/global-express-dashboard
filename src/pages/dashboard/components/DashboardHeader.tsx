import type { ReactElement } from 'react';
import { Download, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import type { UiAction } from '@/types';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  actions: UiAction[];
  onAction?: (action: UiAction) => void;
}

const actionIconMap: Record<string, ReactElement> = {
  export: <Download className="h-5 w-5" />,
  tracking: <MapPin className="h-5 w-5" />,
  plus: <Plus className="h-5 w-5" />,
};

export function DashboardHeader({
  title,
  subtitle,
  actions,
  onAction,
}: DashboardHeaderProps): ReactElement {
  const orderedActions = [
    ...actions.filter((action) => action.id === 'newOrder'),
    ...actions.filter((action) => action.id !== 'newOrder'),
  ];

  const renderAction = (action: UiAction): ReactElement => {
    const icon = actionIconMap[action.icon] ?? <Plus className="h-4 w-4" />;
    const isPrimary = action.id === 'newOrder';

    return (
      <Button
        key={action.id}
        type="button"
        size="sm"
        variant={isPrimary ? 'primary' : 'secondary'}
        leftIcon={icon}
        onClick={() => onAction?.(action)}
        {...(isPrimary ? { 'data-tour': 'preorder-btn' } : {})}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {orderedActions.map(renderAction)}
      </div>
    </div>
  );
}
