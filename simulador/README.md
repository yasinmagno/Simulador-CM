# Simulador de Comunicação Resiliente — HCM ↔ Guaxene

Simulador académico para a cadeira de **Comunicação Móvel (ISCTEM)**.  
Modela o enlace PtP a 5,8 GHz entre o Hospital Central de Maputo e a EPC Guaxene (KaTembe), com 9 cenários de falha e recuperação.

---

## Requisitos

| Componente | Versão mínima | Onde obter |
|------------|---------------|------------|
| Python     | 3.11          | https://www.python.org (marcar **"Add python.exe to PATH"**) |
| Node.js    | 18.17 (recomendado: LTS actual) | https://nodejs.org |
| Git        | —             | https://git-scm.com |

Os scripts `.bat` são para **Windows**. Em macOS/Linux, ver a instalação manual abaixo.

---

## Instalação

### Windows — um passo (recomendado)

```bat
git clone https://github.com/yasinmagno/Simulador-CM.git
cd Simulador-CM\simulador
instalar.bat
```

O `instalar.bat`:
1. verifica as versões do Node.js e do Python;
2. cria `backend\venv` e instala as dependências Python;
3. instala as dependências do frontend e copia o Cesium (3D) para `frontend\public\cesium`;
4. instala os scripts de arranque da raiz;
5. corre os testes do backend para confirmar que está tudo bem.

Depois de cada `git pull` que altere dependências (`requirements.txt` ou `package.json`), voltar a correr `instalar.bat`.

### Manual (qualquer sistema)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt      # Windows
# venv/bin/python -m pip install -r requirements.txt        # macOS/Linux

# Frontend (o postinstall copia os assets do Cesium para public/cesium)
cd ../frontend
npm ci

# Raiz (opcional — arranque com um só comando, Windows)
cd ..
npm ci
```

> Em macOS/Linux, os scripts `npm run dev`/`start` da raiz usam caminhos do Windows; arrancar o backend
> com `venv/bin/python -m uvicorn app.main:app` e o frontend com `npm run dev` em dois terminais.

---

## Arranque

Abrir **dois terminais** na pasta `simulador/`:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\python -m uvicorn app.main:app --reload
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

### Para a apresentação/defesa (modo de produção — recomendado)

Duplo clique em **`iniciar_apresentacao.bat`**, ou:

```bash
npm run apresentacao   # compila o frontend (next build) e arranca backend + frontend sem modo de desenvolvimento
```

O modo de desenvolvimento carrega ~12 MB de JavaScript só para abrir a página; o de produção
carrega ~0,8 MB. Depois da primeira compilação basta `npm run start`.

---

## Modo defesa (slides + simulador)

Abrir **http://localhost:3000/apresentacao** (o `iniciar_apresentacao.bat` já abre esta página), ou o botão
**Modo defesa** no cabeçalho. São 18 slides; os técnicos usam os componentes e o motor do simulador ao vivo
(mapa, orçamento do enlace, Fresnel, modulação, esquema, baterias, resiliência, 3D) e o slide 15 é o simulador completo.

| Tecla | Acção |
|-------|-------|
| → ← / PageDown PageUp / Espaço | Slide seguinte / anterior (funciona com apresentadores USB) |
| 1–9 | Carregar um cenário (slides de modulação e resiliência) |
| F | Ecrã inteiro |
| S | Janela do orador: notas, slide seguinte e cronómetro, sincronizada com a apresentação |

Se o backend não responder, os slides mostram os valores do relatório.

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

## Construtor de cenários (qualquer combinação, sem tempo real)

O painel **Construir cenário** (à esquerda) permite combinar livremente:

- Rede: PtP, 4G/5G local, 4G/5G externo, ISP/fibra, satélite
- Energia: EDM e solar em cada local
- Condições: atenuação extra (dB), **tempo sem EDM** (0–120 h) e sol disponível (%)

Cada alteração é simulada de imediato via `POST /api/simulation/run` (sem estado: o mesmo
input dá sempre o mesmo resultado). O tempo não corre como relógio — salta-se directamente
para qualquer hora após o corte (botões 0/24/48/72/96/120 h). As baterias são calculadas
a partir de cheias, com perfil solar diário (PVGIS Maputo, 4,36 kWh/kWp/dia; corte às 18h).
Os 9 cenários predefinidos preenchem o construtor e podem depois ser alterados.

### Linha temporal

No separador **Linha temporal** define-se uma sequência de eventos (ex.: 6 h — PtP em falha,
10 h — EDM Guaxene em falha, 100 h — EDM restaurada). `POST /api/simulation/timeline` calcula
todo o percurso de uma vez (baterias com descarga, solar e recarga a C/10 quando a EDM volta).
A barra inferior mostra o estado em cada hora; pode-se arrastar o cursor, recuar ou reproduzir
(1×/4×/10×) — a reprodução apenas percorre resultados já calculados.

---

## Animações do estado da máquina

- **Diagrama de estados** (topo): NORMAL → DEGRADADO → EMERGÊNCIA → CRÍTICO → FALHA; o estado
  actual pulsa e um marcador viaja até ao novo estado, com a causa da transição.
- **Esquema** (vista por omissão): pacotes circulam só nos caminhos em uso (PtP, 4G/5G, ISP,
  satélite — este mais lento, pela latência); componentes em falha a vermelho com ✕; edifícios
  apagam-se sem energia; bateria a esvaziar; sol a carregar; chuva com atenuação extra;
  alerta "Guaxene isolada".
- **Escada de modulação** (painel direito): degrau aceso = modulação em uso; capacidade em
  contagem animada com o limiar de 15 Mbps.
- **Gráfico das baterias**: carga útil ao longo do corte, requisito de 72 h e instante actual
  (clicar no gráfico salta para essa hora).
- **Mapa 2D**: tracejado a correr no caminho activo e BTS 4G/5G; borda a pulsar em CRÍTICO/FALHA.

---

## Visualização 3D (toggle Esquema/2D/3D)

Clicar no botão **3D** no canto superior do mapa. O Cesium é carregado já compilado
(`/cesium/Cesium.js`, copiado pelo `postinstall` do frontend), não pelo webpack.  
A vista 3D utiliza CesiumJS com terreno elipsoide (não requer token Ion); a base é OpenStreetMap
quando há Internet, com NaturalEarth como recurso offline.  
Mostra: marcadores HCM/EPC (sem energia ficam cinzentos), enlace com pacotes animados, BTS 4G/5G,
satélite, perfil de terreno e a 1.ª zona de Fresnel como elipsóide orientado ao longo do enlace.
**Exagero vertical** ×1/×5/×10 (só visual — os cálculos usam a geometria real) e botão
**Voar pelo enlace** (automático ao abrir no modo Apresentação).

> **Nota:** A visualização 3D requer browser moderno com suporte WebGL.

---

## Secção "Fórmulas"

O botão **Σ Fórmulas** (cabeçalho) abre todas as equações usadas pelo motor — link budget,
Fresnel, curvatura, energia, solar e estados — com a substituição feita com os valores do
cenário actual. Os botões ⓘ do painel direito abrem a fórmula correspondente.

---

## API

| Método | Rota | Função |
|--------|------|--------|
| GET  | `/api/config` | Parâmetros oficiais (`project_config.json`) |
| GET  | `/api/scenarios` | Os 9 cenários predefinidos |
| POST | `/api/scenarios/{id}/run` | Executa um cenário predefinido |
| POST | `/api/simulation/run` | Qualquer combinação de falhas num instante após o corte (sem estado) |
| POST | `/api/simulation/timeline` | Sequência de eventos calculada de uma vez |

As respostas grandes são comprimidas (gzip). Valores fora do intervalo (ex.: atenuação negativa)
são rejeitados com HTTP 422.

---

## Testes (backend)

```bash
cd backend
venv\Scripts\python -m pytest tests/ -v
```

Resultado esperado: **79/79 testes aprovados**.

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
│   ├── tests/test_rf_calculator.py      ← testes do motor RF
│   ├── tests/test_simulation.py         ← simulação, linha temporal e validação
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
