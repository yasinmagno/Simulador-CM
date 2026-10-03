# Contexto da sessão — 2026-10-03

Notas para retomar o trabalho no **Simulador de Comunicação Resiliente HCM ↔ Guaxene**
(enlace PtP 5,8 GHz, 3,69 km — cadeira de Comunicação Móvel, ISCTEM).

## O que foi feito nesta sessão

1. Pus o simulador a correr com `npm run dev`, na pasta `simulador/`.
   - O script `predev` liberta primeiro as portas 3000 e 8000.
   - O `concurrently` arranca o backend e o frontend em simultâneo.
2. Confirmei que os dois serviços responderam com HTTP 200:
   - Frontend (Next.js 14.2.5): http://localhost:3000
   - Backend (FastAPI/Uvicorn): http://127.0.0.1:8000, com a documentação em `/docs`
3. Abri o browser em http://localhost:3000.
4. Não alterei código nesta sessão. Apenas criei este ficheiro.

> Os servidores estavam a correr em segundo plano dentro da sessão do Claude Code.
> Ao fechar a sessão, provavelmente param. Se não pararem, o `predev` liberta as portas no próximo arranque.

## Como voltar a arrancar

Na pasta `simulador/`, há duas formas:

```bash
npm run dev        # backend e frontend num só terminal
```

ou fazer duplo clique em `iniciar.bat`, que abre duas janelas e o browser.

Pré-requisitos já instalados: `backend/venv` (Python 3.12), `frontend/node_modules` e `node_modules` na raiz.

## Estado do repositório (git)

- Branch: `main`.
- **Commit feito:** `731858c Expande simulador: novos componentes, testes e notas de pesquisa`.
  Inclui todas as alterações listadas abaixo e também as pastas `../reports/` e `../research_notes/`.
- Ainda não fiz push para o `origin` (https://github.com/yasinmagno/Simulador-CM.git).

**Backend modificado:**
- `app/api/routes.py`
- `app/config/project_config.json`
- `app/engine/rf_calculator.py`
- `app/engine/state_machine.py`
- `app/models/schemas.py`

**Backend novo:**
- `backend/tests/test_simulation.py`

**Frontend modificado:**
- `CalculationModal`, `CesiumView`, `ControlPanel`, `EventLog`, `LeafletMap`, `MapView` e `SidePanel`
- `lib/api.ts`, `pages/index.tsx`, `store/simulation.ts`, `styles/globals.css` e `types/simulation.ts`
- `package.json` e `package-lock.json`

**Frontend novo:**
- Componentes `EnergyChart.tsx`, `ModulationLadder.tsx`, `NetworkSchematic.tsx`, `ScenarioBuilder.tsx`, `StateMachineDiagram.tsx` e `Timeline.tsx`
- `hooks/useAnimatedNumber.ts`
- `lib/estado.ts`
- `scripts/copy-cesium.js` (o postinstall copia os assets do Cesium para `public/cesium`)

**Frontend removido (staged):**
- `components/TimeControl.tsx`

**Raiz:**
- `README.md`, `iniciar.bat` e `package.json` foram modificados.
- Fora de `simulador/` há duas pastas novas, ainda não seguidas pelo git: `../reports/` e `../research_notes/` (pesquisa sobre "Simuladores RF e resiliência existentes").

## Estrutura do projeto

```
simulador/
├── backend/            FastAPI
│   ├── app/api/        routes.py
│   ├── app/engine/     rf_calculator.py, state_machine.py
│   ├── app/models/     schemas.py
│   ├── app/config/     project_config.json
│   ├── app/scenarios/  cenario_01.json … cenario_09.json (9 cenários de falha/recuperação)
│   └── tests/          test_simulation.py
├── frontend/           Next.js + Tailwind + Cesium/Leaflet
│   └── src/{components,hooks,lib,pages,store,styles,types}
├── iniciar.bat
├── package.json        scripts dev / dev:backend / dev:frontend
├── README.md
└── Relatorio.md
```

## Próximos passos sugeridos

- [x] Fazer commit das alterações (feito: `731858c`).
- [ ] Correr os testes do backend: `cd backend && venv\Scripts\python -m pytest tests`
- [x] Incluir `../reports/` e `../research_notes/` no repositório (entraram no commit `731858c`).
- [ ] Ponderar pôr `frontend/tsconfig.tsbuildinfo` no `.gitignore`, porque é um ficheiro gerado.
