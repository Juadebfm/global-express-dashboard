import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SupplierPortalUser } from '@/types/supplierPortal.types';

interface SupplierAuthState {
  token: string | null;
  user: SupplierPortalUser | null;
  setAuth: (token: string, user: SupplierPortalUser) => void;
  clearAuth: () => void;
}

export const useSupplierAuthStore = create<SupplierAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'gex_supplier_auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
