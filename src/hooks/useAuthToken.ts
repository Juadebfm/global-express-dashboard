import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from './useAuth';

const TOKEN_KEY = 'globalxpress_token';

export function useAuthToken(): () => Promise<string | null> {
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const { user } = useAuth();

  const isCustomer = isClerkSignedIn && !user;

  return async (): Promise<string | null> => {
    if (isCustomer) return getToken();
    return localStorage.getItem(TOKEN_KEY);
  };
}
