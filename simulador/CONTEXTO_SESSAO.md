# Contexto da sessão — 2026-10-11

Notas para retomar o trabalho no **Simulador de Comunicação Resiliente HCM ↔ Guaxene**
(enlace PtP 5,8 GHz, 3,69 km — cadeira de Comunicação Móvel, ISCTEM).

## Instalar e arrancar (para todos os membros do grupo)

```bat
git clone https://github.com/yasinmagno/Simulador-CM.git
cd Simulador-CM\simulador
instalar.bat                 :: uma vez (e depois de cada pull que mude dependências)
iniciar_apresentacao.bat     :: defesa/apresentação — modo de produção, leve
iniciar.bat                  :: desenvolvimento (ou: npm run dev)
```

Requisitos: Python ≥ 3.11 e Node.js ≥ 18.17. O `instalar.bat` verifica as versões, cria
`backend\venv`, instala tudo, copia o Cesium para `frontend\public\cesium` e corre os testes.
Testado numa cópia limpa do projecto: instalação em ~30–45 s, 79/79 testes, 9/9 cenários no browser.

## O que foi feito nesta sessão

**Correcções da interface**
- Layout responsivo (telemóvel: secções empilhadas, sem scroll horizontal).
- Esquema: caminhos sem energia aparecem como "sem energia"; avisos "HCM/GUAXENE SEM ENERGIA" já não tapam texto.
- Painel direito: P_R/SNR/FM marcados como "valores teóricos" quando o rádio está fora de serviço.
- Guaxene passa a "Escola Primária Completa · KaTembe" (antes dizia "Centro de acomodação").
- Diagrama de estados com mais espaço; eixo do perfil de Fresnel em 0,5 km; ponto crítico ⚠ desenhado na altura certa.

**Nova secção "Fórmulas"** (`FormulasPanel.tsx`, botão Σ no cabeçalho)
- 18 fórmulas (rádio, Fresnel/LOS, energia, resiliência) com substituição pelos valores do cenário actual
  e etiqueta da origem de cada valor (relatório, premissa académica, ilustrativo, física).

**Animação 3D (`CesiumView.tsx`)**
- Voo reescrito: a zona de Fresnel vê-se de lado, o voo pára antes de Guaxene, vista final com as duas etiquetas.
- Sem erro 401 do Cesium Ion; atribuição do OpenStreetMap visível; terreno igual ao do `project_config.json`.
- Só redesenha quando muda algo visível; 30 fps; corrigido o caso de dois viewers em simultâneo.
- O Cesium é carregado já compilado (`/cesium/Cesium.js`), não pelo webpack.

**Optimizações e limpeza**
- Modo de produção para a defesa: ~0,8 MB de JS em vez de ~12 MB; 3D: ~6,4 MB em vez de ~49 MB.
- Backend: gzip (linha temporal 154 KB → 4 KB); removidos os endpoints antigos com estado
  (`/advance`, `/reset`, `/state`, `/calculate/*`) e `update_battery` (dava 96 h em vez de 86,4 h).
- Validação das entradas (atenuação ≥ 0, tempo 0–240 h, passo ≥ 0,25 h; erros na linha temporal → 422).
- Dependências: Next.js 14.2.5 → 14.2.35 (correcções de segurança), `concurrently` 9 (funciona com Node 18),
  `numpy` retirado (não era usado). `tsconfig.tsbuildinfo` passou para o `.gitignore`.

## Pendente / a confirmar

- [ ] **Tráfego no `project_config.json`:** os serviços somam 8,9 Mbps + 4,1 de margem = **13 Mbps**,
      mas o requisito diz **15 Mbps**. Confirmar no relatório.
- [ ] Substituir os dados ilustrativos (alturas das antenas, altitude e perfil do terreno, NF) pelos do relatório.
- [ ] `npm audit` ainda aponta avisos ao Next 14 que só desaparecem no Next 16 (migração maior; não afecta o uso local).

## Estrutura do projecto

```
simulador/
├── backend/            FastAPI — app/{api,engine,models,config,scenarios}, tests/ (79 testes)
├── frontend/           Next.js + Tailwind + Cesium/Leaflet — src/{components,hooks,lib,pages,store,styles,types}
├── instalar.bat        instalação num passo (Windows)
├── iniciar.bat         arranque em desenvolvimento
├── iniciar_apresentacao.bat  arranque em produção (defesa)
├── package.json        scripts dev / build / start / apresentacao
├── README.md
└── Relatorio.md
```
