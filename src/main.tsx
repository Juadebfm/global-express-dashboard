import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import './i18n/i18n';
import './index.css';
import App from './App.tsx';
import { queryClient } from './lib/queryClient';
import { RouteErrorBoundary } from './components/errors';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// RouteErrorBoundary also wraps the route tree further down (see App.tsx),
// but that instance is a descendant of ClerkProvider and can't catch a
// failure in ClerkProvider itself — an error there would otherwise leave
// #root permanently empty with no recovery path. This outer boundary is
// the last resort above everything, including Clerk's own init.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouteErrorBoundary>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </RouteErrorBoundary>
  </StrictMode>,
);
