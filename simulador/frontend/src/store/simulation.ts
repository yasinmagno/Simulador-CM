import { create } from 'zustand';
import { api } from '@/lib/api';
import type {
  SimulationInput, SimulationResult, AppMode, SimMode, TimelineChange, TimelineResult,
} from '@/types/simulation';

/** Operação normal — valores oficiais do relatório. */
export const DEFAULT_INPUT: SimulationInput = {
  ptp_ativo: true,
  g4_local_disponivel: true,
  g4_externo_disponivel: true,
  isp_ativo: true,
  satelite_ativo: true,
  edm_hcm: true,
  edm_guaxene: true,
  bateria_hcm_wh: 12000,
  bateria_guaxene_wh: 3600,
  solar_hcm_ativo: false,
  solar_guaxene_ativo: false,
  l_ambiente_db: 0,
  tempo_simulado_h: 0,
  fator_solar: 1,
};

/** História de exemplo para a linha temporal (editável na interface). */
export const DEFAULT_TIMELINE: TimelineChange[] = [
  { tempo_h: 2,   alteracoes: { l_ambiente_db: 12 } },
  { tempo_h: 6,   alteracoes: { ptp_ativo: false } },
  { tempo_h: 10,  alteracoes: { edm_guaxene: false } },
  { tempo_h: 14,  alteracoes: { g4_local_disponivel: false } },
  { tempo_h: 30,  alteracoes: { ptp_ativo: true, l_ambiente_db: 0 } },
  { tempo_h: 100, alteracoes: { edm_guaxene: true } },
];

/** Constrói o resultado do instante `i` a partir da linha temporal já calculada. */
function frameResult(tl: TimelineResult, i: number): SimulationResult {
  const f = tl.frames[i];
  return {
    input: f.input,
    link_budget: f.link_budget,
    fresnel: tl.fresnel,
    energy: f.energy,
    network: f.network,
    eventos: tl.frames.slice(0, i + 1).flatMap((fr) => fr.eventos),
    energia_serie: tl.frames.map((fr) => ({
      tempo_h: fr.tempo_h,
      hcm_bateria_wh: fr.input.bateria_hcm_wh,
      guaxene_bateria_wh: fr.input.bateria_guaxene_wh,
      hcm_solar_w: 0,
      guaxene_solar_w: 0,
    })),
  };
}

interface SimulationStore {
  result: SimulationResult | null;
  loading: boolean;
  error: string | null;
  mode: AppMode;
  selectedScenario: number;
  /** true quando o cenário foi alterado no construtor (já não é um predefinido) */
  custom: boolean;
  /** Cenário em construção — cada alteração é simulada de imediato */
  draft: SimulationInput;
  calcModalOpen: boolean;
  calcModalKey: string | null;

  /** Instantâneo (construtor) ou linha temporal de eventos */
  simMode: SimMode;
  timelineEvents: TimelineChange[];
  timelineDuracao: number;
  timeline: TimelineResult | null;
  frameIdx: number;

  setSimMode: (m: SimMode) => void;
  setTimelineEvents: (ev: TimelineChange[]) => void;
  setTimelineDuracao: (h: number) => void;
  runTimeline: () => Promise<void>;
  setFrame: (i: number) => void;

  setMode: (m: AppMode) => void;
  setSelectedScenario: (n: number) => void;
  openCalcModal: (key: string) => void;
  closeCalcModal: () => void;

  setDraft: (patch: Partial<SimulationInput>) => void;
  reset: () => Promise<void>;
  runScenario: (id: number) => Promise<void>;
}

// Só o pedido mais recente atualiza o ecrã (evita respostas fora de ordem ao arrastar sliders)
let requestSeq = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useSimulation = create<SimulationStore>((set, get) => {
  const simulate = async (inp: SimulationInput, extra: Partial<SimulationStore> = {}) => {
    const seq = ++requestSeq;
    set({ loading: true, error: null });
    try {
      const result = await api.run(inp);
      if (seq === requestSeq) set({ result, loading: false, ...extra });
    } catch (e) {
      if (seq === requestSeq) set({ error: String(e), loading: false });
    }
  };

  return {
    result: null,
    loading: false,
    error: null,
    mode: 'apresentacao',
    selectedScenario: 1,
    custom: false,
    draft: DEFAULT_INPUT,
    calcModalOpen: false,
    calcModalKey: null,

    simMode: 'instantaneo',
    timelineEvents: DEFAULT_TIMELINE,
    timelineDuracao: 120,
    timeline: null,
    frameIdx: 0,

    setSimMode: (m) => {
      set({ simMode: m });
      if (m === 'linha') get().runTimeline();
      else simulate(get().draft);
    },
    setTimelineEvents: (ev) => {
      set({ timelineEvents: [...ev].sort((a, b) => a.tempo_h - b.tempo_h) });
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => get().runTimeline(), 200);
    },
    setTimelineDuracao: (h) => {
      set({ timelineDuracao: h });
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => get().runTimeline(), 200);
    },
    runTimeline: async () => {
      const seq = ++requestSeq;
      set({ loading: true, error: null });
      try {
        const { timelineEvents, timelineDuracao, frameIdx } = get();
        const tl = await api.timeline(DEFAULT_INPUT, timelineEvents, timelineDuracao);
        if (seq !== requestSeq) return;
        const i = Math.min(frameIdx, tl.frames.length - 1);
        set({ timeline: tl, frameIdx: i, result: frameResult(tl, i), loading: false });
      } catch (e) {
        if (seq === requestSeq) set({ error: String(e), loading: false });
      }
    },
    setFrame: (i) => {
      const tl = get().timeline;
      if (!tl) return;
      const idx = Math.max(0, Math.min(i, tl.frames.length - 1));
      set({ frameIdx: idx, result: frameResult(tl, idx) });
    },

    setMode: (m) => set({ mode: m }),
    setSelectedScenario: (n) => set({ selectedScenario: n }),
    openCalcModal: (key) => set({ calcModalOpen: true, calcModalKey: key }),
    closeCalcModal: () => set({ calcModalOpen: false, calcModalKey: null }),

    setDraft: (patch) => {
      const draft = { ...get().draft, ...patch };
      set({ draft, custom: true });
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => simulate(draft), 120);
    },

    reset: async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      set({ draft: DEFAULT_INPUT, custom: false, selectedScenario: 1, simMode: 'instantaneo' });
      await simulate(DEFAULT_INPUT);
    },

    runScenario: async (id) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const seq = ++requestSeq;
      set({ loading: true, error: null, simMode: 'instantaneo' });
      try {
        const result = await api.runScenario(id);
        if (seq !== requestSeq) return;
        // O predefinido preenche o construtor; a partir daqui pode ser alterado livremente
        set({
          result,
          loading: false,
          selectedScenario: id,
          custom: false,
          draft: { ...DEFAULT_INPUT, ...result.input, tempo_simulado_h: 0 },
        });
      } catch (e) {
        if (seq === requestSeq) set({ error: String(e), loading: false });
      }
    },
  };
});
