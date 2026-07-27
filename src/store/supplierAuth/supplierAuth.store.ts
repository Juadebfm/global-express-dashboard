import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SupplierPortalUser } from '@/types/supplierPortal.types';

interface SupplierAuthState {
  token: string | null;
  user: SupplierPortalUser | null;
  setAuth: (token: string, user: SupplierPortalUser) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  clearAuth: () => void;
}

export const useSupplierAuthStore = create<SupplierAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setAvatarUrl: (avatarUrl) => set((state) => (
        state.user ? { user: { ...state.user, avatarUrl } } : state
      )),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'gex_supplier_auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
