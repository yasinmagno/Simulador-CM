/** Estados da máquina de resiliência, por ordem de gravidade. */
export const STATE_ORDER = ['NORMAL', 'DEGRADADO', 'EMERGÊNCIA', 'CRÍTICO', 'FALHA'] as const;
export type Estado = typeof STATE_ORDER[number];

export const STATE_HEX: Record<string, string> = {
  'NORMAL':     '#22c55e',
  'DEGRADADO':  '#eab308',
  'EMERGÊNCIA': '#f97316',
  'CRÍTICO':    '#ef4444',
  'FALHA':      '#991b1b',
};

/** O que cada estado significa — mostrado no diagrama de estados. */
export const STATE_DESC: Record<string, string> = {
  'NORMAL':     'PtP com margem total, EDM e Internet disponíveis',
  'DEGRADADO':  'Serviço mantido com capacidade ou caminho reduzido',
  'EMERGÊNCIA': 'A funcionar em bateria ou com Internet por satélite',
  'CRÍTICO':    'Guaxene sem caminho local — só o HCM tem saída',
  'FALHA':      'Sem qualquer meio de comunicação ou energia',
};
