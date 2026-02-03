import type { ReactElement } from 'react';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = 'Loading...' }: PageLoaderProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15">
      <div className="flex flex-col items-center gap-3">
        <div className="pulse-glow rounded-full bg-white p-3 shadow-lg">
          <img src="/images/favicon.svg" alt="Loading" className="h-10 w-10" />
        </div>
        <p className="text-sm text-white/90">{label}</p>
      </div>
    </div>
  );
}
