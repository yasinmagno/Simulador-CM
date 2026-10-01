# Relatório de Desenvolvimento — Simulador HCM ↔ Guaxene

**Data:** 2026-10-01  
**Estado:** Em curso — fases 1 a 8 concluídas, fase 9 parcial

---

## O que foi feito

### Fase 1 — Prompt e arquitectura
- Leitura do ficheiro `Simulador.pdf` (prompt mestre original)
- Revisão pelo modelo Fable 5 com melhorias críticas
- Criação de `PROMPT_MESTRE.md` na raiz do projecto com todas as decisões técnicas documentadas

### Fase 2 — Backend (Python / FastAPI)

**Ficheiros criados:**

| Ficheiro | Descrição |
|----------|-----------|
| `backend/app/config/project_config.json` | Fonte única de verdade: parâmetros RF, geografia, energia, perfil de terreno (50 amostras) |
| `backend/app/engine/rf_calculator.py` | Toda a matemática RF: FSPL, Fresnel, EIRP, P_R, SNR, FM, modulação adaptativa, autonomia |
| `backend/app/engine/state_machine.py` | Máquina de estados NORMAL → DEGRADADO → EMERGÊNCIA → CRÍTICO → FALHA |
| `backend/app/models/schemas.py` | 12 modelos Pydantic (SimulationInput, LinkBudgetResult, FresnelResult, etc.) |
| `backend/app/api/routes.py` | 9 endpoints REST |
| `backend/app/main.py` | App FastAPI com CORS para localhost:3000 |
| `backend/app/scenarios/cenario_0N.json` | 9 contratos JSON de cenários predefinidos |
| `backend/tests/test_rf_calculator.py` | 44 testes unitários |

**Endpoints disponíveis:**

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/config` | Configuração oficial do projecto |
| POST | `/api/calculate/link-budget` | Link budget completo |
| POST | `/api/calculate/fresnel` | Perfil Fresnel + LOS |
| POST | `/api/calculate/energy` | Estado energético |
| GET | `/api/scenarios` | Lista de cenários |
| POST | `/api/scenarios/{id}/run` | Executar cenário |
| POST | `/api/simulation/reset` | Reiniciar simulação |
| GET | `/api/simulation/state` | Estado actual |
| POST | `/api/simulation/advance?dt_h=N` | Avançar N horas (drenagem de bateria) |

**Resultados dos testes:**
- 44/44 testes unitários aprovados
- 9/9 cenários com estado e caminho correctos

**Valores de referência verificados:**
- P_R = −51.05 dBm ✓
- FM(QPSK) = 33.95 dB ✓
- Fresnel F₁ máx. = 6.91 m ✓
- Curvatura terrestre = 0.20 m ✓
- Autonomia HCM = 86.4 h (12 kWh / 100 W) ✓
- Autonomia Guaxene = 86.4 h (3.6 kWh / 30 W) ✓

### Fase 3 — Modelos e schemas
- Interfaces TypeScript em `frontend/src/types/simulation.ts` a espelhar os modelos Pydantic
- Cliente REST em `frontend/src/lib/api.ts` com todos os métodos incluindo `advance(dt_h)`
- Zustand store em `frontend/src/store/simulation.ts`

### Fase 4 — Dashboard (Frontend)

**Componentes criados:**

| Componente | Descrição |
|------------|-----------|
| `Header.tsx` | Título, badge de estado (maior em modo apresentação), toggle Apresentação/Engenharia |
| `SidePanel.tsx` | Indicadores RF, Fresnel, energia; botões "Ver Cálculo" em modo engenharia |
| `ControlPanel.tsx` | Dropdown de cenários, botão Executar, botão Reset; em modo apresentação adiciona botões Anterior/Próximo e descrição do cenário |
| `EventLog.tsx` | Tabela de eventos ordenados cronologicamente com badges por tipo |
| `CalculationModal.tsx` | Modal com fórmula, substituição, resultado e interpretação para: FSPL, P_R, SNR, FM, Fresnel, Energia |
| `EnlaceProfile.tsx` | Gráfico Recharts com perfil do terreno, zona Fresnel (F₁ sup/inf), linha LOS colorida por estado, limite 60% |
| `TimeControl.tsx` | Barra temporal (só visível com EDM cortada): play/pause, velocidades 1×/5×/10×/24×, barras de bateria HCM e Guaxene |

### Fase 5 — Mapa 2D (Leaflet)
- `LeafletMap.tsx` — marcadores DivIcon (sem CDN, funciona offline): HCM (azul), EPC Guaxene (verde)
- Polilinha PtP colorida pelo estado da rede
- Polilinha 4G/5G tracejada
- Legenda dinâmica com estado actual
- `MapView.tsx` — importação dinâmica com SSR desactivado

### Fase 6 — Visualização 3D (CesiumJS)
- Instalação de `cesium` via npm
- Assets copiados para `frontend/public/cesium/` (Workers, Assets, Widgets, ThirdParty — 389 ficheiros)
- `CesiumView.tsx` — terreno elipsoide (offline, sem token Ion), marcadores HCM/EPC com canvas label, linha LOS colorida pelo estado, perfil do terreno, zona de Fresnel como elipsoide
- `MapView.tsx` actualizado com toggle **2D / 3D** no canto superior do mapa

### Fase 7 — Simulação temporal
- Endpoint `POST /api/simulation/advance?dt_h=N` no backend
- Drenagem correcta verificada: cenário 5 (sem EDM), após 10 h → HCM −1000 Wh, Guaxene −300 Wh
- `TimeControl.tsx` no frontend com play/pause, 4 velocidades, barras de percentagem de bateria

### Fase 8 — Modo apresentação
- Badge de estado maior no header em modo apresentação
- `ControlPanel.tsx` em modo apresentação: botões Anterior / Próximo para sequência guiada, descrição textual do cenário activo
- Modo engenharia mantém todos os indicadores avançados (FM por modulação, λ, curvatura, aviso antenas ilustrativas)

### Fase 10 — Documentação
- `simulador/README.md` com requisitos, instalação, tabela de cenários, parâmetros de referência, estrutura do projecto

### Arranque do projecto
- `simulador/package.json` raiz com `concurrently`
- Script `predev` que liberta as portas 3000 e 8000 antes de arrancar
- `.vscode/tasks.json` para `Ctrl+Shift+B` no VS Code
- `simulador.code-workspace` para abrir o projecto directamente no VS Code

**Comando de arranque (a partir de `simulador/`):**
```
npm run dev
```

---

## Estado actual dos serviços

| Serviço | Porta | Comando |
|---------|-------|---------|
| Backend FastAPI | 8000 | `python -m uvicorn app.main:app --reload` |
| Frontend Next.js | 3000 | `npm run dev` |
| Documentação API | — | http://localhost:8000/docs |

---

## O que falta fazer

### Fase 9 — Testes de integração frontend (pendente)
- Testes automáticos end-to-end que executem os 9 cenários via interface (ex: Playwright ou Cypress)
- Verificação visual dos gráficos Recharts em cada cenário
- Teste do fluxo completo: Reset → Cenário 5 → Play temporal → bateria a drenar

### Fase 6 — Melhorias CesiumJS (opcional)
- A visualização 3D está integrada mas não foi verificada visualmente num browser real com WebGL
- A imagem de fundo offline (`NaturalEarthII`) pode não estar no caminho correcto dentro dos assets copiados — verificar no browser se o globo aparece colorido ou preto
- Possível ajuste: se o tile offline não funcionar, remover o `SingleTileImageryProvider` e usar o fundo por defeito do Cesium (cinzento escuro — funciona sempre)

### Melhorias identificadas durante o desenvolvimento
- **Antenas ilustrativas**: alturas de antena (15 m HCM, 10 m Guaxene) são ilustrativas; o relatório técnico diz para calcular de forma a garantir ≥ 60% de Fresnel — substituir pelos valores reais quando disponíveis em `backend/app/config/project_config.json` nos campos `altura_antena_m`
- **TimeControl reset**: ao executar um novo cenário com o play activo, o cronómetro não para automaticamente — melhorar sincronização entre `runScenario` e `TimeControl`
- **Modo offline do mapa 2D**: quando sem Internet, os tiles OpenStreetMap não carregam; considerar tiles locais ou aviso explícito

---

## Estrutura final do projecto

```
simulador/
├── package.json                  ← raiz: npm run dev arranca tudo
├── README.md                     ← documentação de utilizador
├── Relatorio.md                  ← este ficheiro
├── iniciar.bat                   ← alternativa: duplo clique para arrancar
├── simulador.code-workspace      ← abrir no VS Code
├── .vscode/
│   └── tasks.json                ← Ctrl+Shift+B no VS Code
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── config/project_config.json
│   │   ├── engine/rf_calculator.py
│   │   ├── engine/state_machine.py
│   │   ├── models/schemas.py
│   │   ├── api/routes.py
│   │   ├── scenarios/cenario_01.json … cenario_09.json
│   │   └── main.py
│   └── tests/test_rf_calculator.py
└── frontend/
    ├── package.json
    ├── public/cesium/             ← assets CesiumJS (offline)
    └── src/
        ├── components/
        │   ├── Header.tsx
        │   ├── MapView.tsx        ← toggle 2D/3D
        │   ├── LeafletMap.tsx     ← mapa 2D
        │   ├── CesiumView.tsx     ← vista 3D
        │   ├── SidePanel.tsx
        │   ├── ControlPanel.tsx
        │   ├── EnlaceProfile.tsx
        │   ├── EventLog.tsx
        │   ├── CalculationModal.tsx
        │   └── TimeControl.tsx
        ├── store/simulation.ts
        ├── lib/api.ts
        ├── types/simulation.ts
        └── pages/index.tsx
```

---

## Decisões técnicas importantes

| Decisão | Justificação |
|---------|-------------|
| FM em vez de SNR para selecção de modulação | SNR é informativo; FM = P_R − Sensibilidade reflecte a margem real do equipamento (Ubiquiti AF-5XHD) |
| L_ambiente = 0 dB no caso base | Só modificado nos cenários 6 (chuva, +2,5 dB) e 7 (degradação RF, +10 dB) |
| Alturas de antena ilustrativas | Relatório não fixa valores; usa 15 m (HCM) e 10 m (Guaxene) com aviso visível no modo engenharia |
| DivIcon no Leaflet (sem imagens CDN) | Funciona offline sem dependência de servidores externos |
| EllipsoidTerrainProvider no Cesium | Funciona sem token Ion — visualização 3D 100% offline |
| Hysteresis de 1 dB na máquina de estados | Evita oscilação rápida entre estados em condições limite |
