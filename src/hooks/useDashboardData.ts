import { useEffect, useState } from 'react';
import type { DashboardData } from '@/types';
import { getDashboardData } from '@/services';

interface DashboardDataState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardDataState {
  const [state, setState] = useState<DashboardDataState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    getDashboardData()
      .then((response) => {
        if (isMounted) {
          setState({ data: response, isLoading: false, error: null });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        if (isMounted) {
          setState({ data: null, isLoading: false, error: message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
