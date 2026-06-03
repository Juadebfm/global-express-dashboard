import { can, type Action } from '@/lib/permissions';
import { useAuth } from './useAuth';

/**
 * Thin hook wrapper around `can()`. Reads the current internal-user
 * role from AuthContext and looks up the action in the policy map.
 *
 * For external (Clerk-only) sessions, `useAuth().user` is null and
 * this returns false for every action — those users never see staff
 * chrome. If you need to detect a logged-in customer specifically,
 * check `isClerkSignedIn` from `useClerkAuth()` directly.
 *
 * Usage:
 *   const canDeleteImage = useCan('orders.deleteImage');
 *   if (canDeleteImage) { ... }
 */
export function useCan(action: Action): boolean {
  const { user } = useAuth();
  return can(user?.role, action);
}
