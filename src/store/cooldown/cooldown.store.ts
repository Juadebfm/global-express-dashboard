import { create } from 'zustand';

interface CooldownState {
  // Map of arbitrary caller-chosen keys to the epoch-ms at which the
  // cooldown ends. Keys scope cooldowns by intent — e.g. 'auth:login'
  // means every Login button shares the same 429 cooldown.
  endTimes: Record<string, number>;
  startCooldown: (key: string, seconds: number) => void;
  clear: (key: string) => void;
}

export const useCooldownStore = create<CooldownState>((set) => ({
  endTimes: {},
  startCooldown: (key, seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const endAt = Date.now() + Math.ceil(seconds) * 1000;
    set((state) => ({ endTimes: { ...state.endTimes, [key]: endAt } }));
  },
  clear: (key) =>
    set((state) => {
      if (!(key in state.endTimes)) return state;
      const rest = { ...state.endTimes };
      delete rest[key];
      return { endTimes: rest };
    }),
}));
