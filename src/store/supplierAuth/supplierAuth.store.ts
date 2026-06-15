import { create } from 'zustand';
import type { SupplierPortalUser } from '@/types/supplierPortal.types';

interface SupplierAuthState {
  token: string | null;
  user: SupplierPortalUser | null;
  setAuth: (token: string, user: SupplierPortalUser) => void;
  clearAuth: () => void;
}

export const useSupplierAuthStore = create<SupplierAuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
}));
