import { create } from 'zustand';
import { api } from '@/lib/api';
import type { SimulationResult, AppMode } from '@/types/simulation';

interface SimulationStore {
  result: SimulationResult | null;
  loading: boolean;
  error: string | null;
  mode: AppMode;
  selectedScenario: number;
  calcModalOpen: boolean;
  calcModalKey: string | null;

  setMode: (m: AppMode) => void;
  setSelectedScenario: (n: number) => void;
  openCalcModal: (key: string) => void;
  closeCalcModal: () => void;

  reset: () => Promise<void>;
  runScenario: (id: number) => Promise<void>;
}

export const useSimulation = create<SimulationStore>((set, get) => ({
  result: null,
  loading: false,
  error: null,
  mode: 'apresentacao',
  selectedScenario: 1,
  calcModalOpen: false,
  calcModalKey: null,

  setMode: (m) => set({ mode: m }),
  setSelectedScenario: (n) => set({ selectedScenario: n }),
  openCalcModal: (key) => set({ calcModalOpen: true, calcModalKey: key }),
  closeCalcModal: () => set({ calcModalOpen: false, calcModalKey: null }),

  reset: async () => {
    set({ loading: true, error: null });
    try {
      const result = await api.reset();
      set({ result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  runScenario: async (id) => {
    set({ loading: true, error: null });
    try {
      const result = await api.runScenario(id);
      set({ result, loading: false, selectedScenario: id });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
