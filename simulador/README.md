# Simulador de Comunicação Resiliente — HCM ↔ Guaxene

Simulador académico para a cadeira de **Comunicação Móvel (ISCTEM)**.  
Modela o enlace PtP a 5,8 GHz entre o Hospital Central de Maputo e a EPC Guaxene (KaTembe), com 9 cenários de falha e recuperação.

---

## Requisitos

| Componente | Versão mínima |
|------------|---------------|
| Python     | 3.11          |
| Node.js    | 18 LTS        |
| npm        | 9+            |

---

## Instalação

### 1. Backend (FastAPI)

```bash
cd backend
python -m pip install -r requirements.txt
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
```

---

## Arranque

Abrir **dois terminais** na pasta `simulador/`:

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload
# Disponível em http://localhost:8000
# Documentação automática: http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Disponível em http://localhost:3000
```

Abrir **http://localhost:3000** no browser.

---

## Modos de operação

| Modo         | Descrição |
|--------------|-----------|
| Apresentação | Vista limpa para projetor. Botão "Próximo" avança cenários em sequência. |
| Engenharia   | Mostra todos os indicadores RF (FM, λ, curvatura terrestre, aviso antenas ilustrativas). |

Alternar com os botões no canto superior direito.

---

## Cenários predefinidos

| # | Nome                      | Estado esperado | Descrição breve |
|---|---------------------------|-----------------|-----------------|
| 1 | Operação Normal           | NORMAL          | Todos os sistemas operacionais |
| 2 | Falha do PtP              | DEGRADADO       | Enlace PtP inoperacional; comuta para 4G/5G |
| 3 | Falha da Rede Móvel       | NORMAL          | 4G/5G indisponível; PtP mantém tráfego |
| 4 | Falha da Internet Externa | EMERGÊNCIA      | ISP cortado; satélite como contingência |
| 5 | Corte de Energia (EDM)    | EMERGÊNCIA      | Baterias ativas; autonomia 86,4 h |
| 6 | Chuva Intensa             | DEGRADADO       | +2,5 dB atenuação; modulação adaptativa |
| 7 | Degradação RF             | DEGRADADO       | +10 dB; regride para 256-QAM |
| 8 | Situação Crítica          | CRÍTICO         | PtP + 4G/5G em falha simultânea |
| 9 | Recuperação               | NORMAL          | Todos os sistemas restaurados |

---

## Parâmetros de referência (Relatório Técnico)

| Parâmetro           | Valor          |
|---------------------|----------------|
| Frequência          | 5,8 GHz        |
| Largura de canal    | 20 MHz         |
| Distância           | 3,69 km        |
| EIRP                | 36 dBm         |
| P_R (base)          | −51,05 dBm     |
| FM (QPSK)           | 33,95 dB       |
| Fresnel F₁ máx.     | 6,91 m         |
| Curvatura terrestre | 0,20 m         |
| Autonomia HCM       | 86,4 h (12 kWh / 100 W) |
| Autonomia Guaxene   | 86,4 h (3,6 kWh / 30 W) |

---

## Simulação temporal (Fase 5 — Corte EDM)

1. Executar cenário **5 — Corte de Energia**
2. A barra de controlo temporal aparece na interface
3. Clicar **Play** e selecionar velocidade (1×, 5×, 10×, 24×)
4. As baterias drenam em tempo real; os indicadores atualizam automaticamente

---

## Visualização 3D (toggle 2D/3D)

Clicar no botão **3D** no canto superior do mapa.  
A vista 3D utiliza CesiumJS com terreno elipsoide (funciona offline — não requer token Ion).  
Mostra: marcadores HCM/EPC, linha LOS colorida pelo estado, perfil de terreno, zona de Fresnel.

> **Nota:** A visualização 3D requer browser moderno com suporte WebGL.

---

## Testes (backend)

```bash
cd backend
python -m pytest tests/ -v
```

Resultado esperado: **44/44 testes aprovados**.

---

## Estrutura do projeto

```
simulador/
├── backend/
│   ├── app/
│   │   ├── config/project_config.json   ← parâmetros RF e energia
│   │   ├── engine/
│   │   │   ├── rf_calculator.py         ← toda a matemática RF
│   │   │   └── state_machine.py         ← máquina de estados
│   │   ├── models/schemas.py            ← modelos Pydantic
│   │   ├── api/routes.py                ← endpoints REST
│   │   ├── scenarios/cenario_0N.json    ← 9 cenários predefinidos
│   │   └── main.py                      ← app FastAPI
│   ├── tests/test_rf_calculator.py      ← 44 testes unitários
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/                  ← Header, Map, SidePanel, etc.
    │   ├── store/simulation.ts          ← Zustand store
    │   ├── lib/api.ts                   ← cliente REST
    │   └── types/simulation.ts          ← interfaces TypeScript
    └── package.json
```

---

## Tecnologias

**Backend:** Python 3.11 · FastAPI · Pydantic v2 · pytest  
**Frontend:** Next.js 14 · TypeScript · Tailwind CSS · Zustand · Recharts · Leaflet · CesiumJS
