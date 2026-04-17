import { useEffect, useMemo, useState } from 'react';
import {
  formatProvisioningCountdown,
  getProvisioningRemainingMs,
  isProvisioningGateActive,
} from '@/constants';

interface UseProvisioningGateResult {
  isProvisioningActive: boolean;
  remainingMs: number;
  countdownLabel: string;
}

export function useProvisioningGate(): UseProvisioningGateResult {
  const [remainingMs, setRemainingMs] = useState<number>(() => getProvisioningRemainingMs());
  const [isProvisioningActive, setIsProvisioningActive] = useState<boolean>(() => isProvisioningGateActive());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemainingMs(getProvisioningRemainingMs());
      setIsProvisioningActive(isProvisioningGateActive());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const countdownLabel = useMemo(
    () => formatProvisioningCountdown(remainingMs),
    [remainingMs],
  );

  return {
    isProvisioningActive,
    remainingMs,
    countdownLabel,
  };
}
