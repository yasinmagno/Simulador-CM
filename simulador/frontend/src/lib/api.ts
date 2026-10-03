import type {
  SimulationInput, SimulationResult, FresnelResult, EnergyState, TimelineChange, TimelineResult,
} from '@/types/simulation';

const BASE = 'http://localhost:8000/api';

async function post<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  reset: ()                       => post<SimulationResult>('/simulation/reset'),
  state: ()                       => get<SimulationResult>('/simulation/state'),
  runScenario: (id: number)       => post<SimulationResult>(`/scenarios/${id}/run`),
  run: (inp: SimulationInput)     => post<SimulationResult>('/simulation/run', inp),
  timeline: (base: SimulationInput, eventos: TimelineChange[], duracao_h: number) =>
    post<TimelineResult>('/simulation/timeline', { base, eventos, duracao_h, passo_h: 1 }),
  advance: (dt_h: number)         => post<SimulationResult>(`/simulation/advance?dt_h=${dt_h}`),
  scenarios: ()                   => get<object[]>('/scenarios'),
  linkBudget: (inp: Partial<SimulationInput>) => post<SimulationResult>('/calculate/link-budget', inp),
  fresnel: ()                     => post<FresnelResult>('/calculate/fresnel', {}),
  energy: (inp: Partial<SimulationInput>) => post<EnergyState>('/calculate/energy', inp),
  config: ()                      => get<object>('/config'),
};
