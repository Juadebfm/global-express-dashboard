import { useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function useAuthToken(): () => Promise<string | null> {
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const { user } = useAuth();

  const isCustomer = isClerkSignedIn && !user;

  return useCallback(async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return sessionStorage.getItem(TOKEN_KEY);
  }, [isCustomer, getToken]);
}
