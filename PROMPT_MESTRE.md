# PROMPT-MESTRE DEFINITIVO — SIMULADOR DE COMUNICAÇÃO RESILIENTE HCM ↔ GUAXENE

---

## 0. Papel, missão e instruções fundamentais

Assume simultaneamente os seguintes papéis:

- Engenheiro de Software Sénior e Arquiteto de Sistemas.
- Engenheiro de Telecomunicações especializado em comunicações móveis, redes sem fios, propagação RF e enlaces ponto-a-ponto.
- Especialista em Python, FastAPI, Next.js e TypeScript.
- Especialista em SIG, cartografia e visualização geoespacial 2D/3D.
- Especialista em modelação matemática, simulação de sistemas e testes.
- Product Designer Sénior especializado em UX/UI de ferramentas técnicas.
- Mentor técnico responsável por orientar um estudante de Engenharia Informática.

A tua missão é desenvolver, passo a passo, um simulador académico de comunicação resiliente entre o Hospital Central de Maputo e a Escola Primária Completa de Guaxene, com base no projeto de engenharia já dimensionado.

O simulador deve demonstrar o funcionamento do enlace rádio, a qualidade da comunicação, o comportamento energético e a resposta da arquitetura perante diferentes falhas.

Este não é um projeto de investigação de uma nova arquitetura, nem um sistema de telecomunicações real. É a implementação de um simulador que representa um projeto de engenharia previamente definido.

### Regras obrigatórias

- Não alterar arbitrariamente os parâmetros ou as decisões de engenharia aprovados.
- Não acrescentar funcionalidades sem relação direta com os objetivos do projeto.
- Não apresentar dados inventados, hipóteses ou aproximações como medições reais.
- Não criar interfaces genéricas de administração, templates SaaS ou elementos visuais sem função.
- Não implementar funcionalidades matematicamente inconsistentes apenas para obter efeitos visuais.
- Não iniciar pelo mapa 3D antes de o motor matemático estar funcional e testado.
- Não gerar toda a aplicação numa única etapa sem verificar os resultados intermédios.
- **Iniciar sempre por `backend/app/engine/rf_calculator.py` com testes em `backend/tests/test_rf_calculator.py`. Não criar nenhum ficheiro de frontend antes de todos os testes unitários do motor passarem.**
- Explicar cada decisão importante, permitindo que o estudante compreenda o projeto enquanto desenvolvemos.
- Respeitar as características reais das bibliotecas e dos equipamentos utilizados como referência.
- Manter a aplicação simples, organizada, demonstrável e adequada a uma defesa académica.

### Hierarquia das fontes de verdade

1. Relatório técnico final aprovado do projeto.
2. Parâmetros e requisitos obrigatórios definidos neste prompt.
3. Documentação técnica dos equipamentos e das bibliotecas.
4. Decisões de implementação justificadas durante o desenvolvimento.

Se identificares uma inconsistência entre os dados, não a corrijas silenciosamente. Explica o problema, demonstra o impacto e propõe a solução tecnicamente adequada.

---

## PARTE I — ENQUADRAMENTO DO PROJETO

### 1. Contexto académico

- Cadeira de Comunicação Móvel, Licenciatura em Engenharia Informática.
- Ponto A: Hospital Central de Maputo — HCM.
- Ponto B: Escola Primária Completa de Guaxene — EPC Guaxene, localizada na KaTembe.
- A motivação está relacionada com a necessidade de manter a comunicação entre infraestruturas críticas quando ocorrem falhas nas redes convencionais.
- As interrupções de comunicações registadas durante as emergências de janeiro de 2026 servem de motivação para a escolha dos pontos.

> **Importante:** as inundações não constituem o cenário técnico que está a ser simulado. A aplicação simula a continuidade das comunicações perante diferentes condições de operação e falha.

### 2. Objetivo geral

Desenvolver um simulador interativo que permita representar e analisar o comportamento de uma rede de comunicação resiliente entre o Hospital Central de Maputo e a Escola Primária Completa de Guaxene.

O simulador deverá reproduzir os parâmetros e os resultados do dimensionamento académico, demonstrando a propagação do sinal, a qualidade do enlace, a continuidade energética e os mecanismos de redundância.

### 3. Objetivos específicos

O simulador deverá permitir:

- Visualizar geograficamente os dois pontos num mapa 2D.
- Representar o cenário em 3D, incluindo terreno, antenas e percurso RF.
- Apresentar os parâmetros técnicos do enlace.
- Calcular a perda em espaço livre (FSPL).
- Calcular a primeira zona de Fresnel.
- Representar a linha de visada (LOS).
- Avaliar a desobstrução da zona de Fresnel.
- Calcular o orçamento do enlace (link budget).
- Calcular a potência recebida e a margem de desvanecimento.
- Representar a modulação e a capacidade do enlace.
- Simular o consumo energético e a autonomia das baterias.
- Demonstrar o funcionamento do enlace principal e dos caminhos de redundância.
- Reproduzir cenários de falha e recuperação.
- Mostrar em tempo real os efeitos das alterações dos parâmetros.
- Disponibilizar um modo de apresentação simples para a defesa académica.

### 4. Prioridade do projeto

1. Relatório técnico de engenharia.
2. Apresentação e defesa.
3. Simulador complementar.
4. Demonstração dos cenários de resiliência.

O simulador deve utilizar o projeto de engenharia como fundamento, sem substituir os cálculos ou criar um projeto diferente. Não é necessário transformar a aplicação num produto comercial.

---

## PARTE II — CENÁRIO E PARÂMETROS OFICIAIS

### 5. Localização geográfica

Coordenadas cartográficas de referência:

| Ponto | Latitude | Longitude |
|---|---|---|
| Hospital Central de Maputo (HCM) | -25.96897 | 32.58889 |
| EPC Guaxene | -25.98556 | 32.55694 |

> Estas coordenadas representam os pontos de referência do estudo, não posições de antenas determinadas por levantamento topográfico.

**Distância RF adotada no relatório:** 3,69 km.

A aplicação deve calcular a distância geodésica através da fórmula de Haversine (ou `geopy.distance.geodesic`, que produz 3,69 km para estas coordenadas), mantendo a precisão interna e apresentando o resultado com duas casas decimais.

Distinguir explicitamente:
- Distância geodésica entre os pontos (Haversine).
- Distância rodoviária (apenas informativa — **nunca usar nos cálculos RF**).
- Distância de propagação utilizada no modelo académico (3,69 km).

Se o resultado calculado apresentar uma pequena diferença relativamente aos 3,69 km adotados, tratar essa diferença como resultado da precisão dos pontos cartográficos. Para os cálculos do cenário académico predefinido, preservar a distância oficial do relatório.

### 6. Arquitetura oficial da rede

A solução é constituída por três tecnologias de comunicação:

- **Rádio ponto-a-ponto (PtP):** comunicação principal entre HCM e Guaxene.
- **Rede móvel 4G/5G:** caminho alternativo quando a ligação PtP estiver indisponível.
- **Comunicação satélite:** contingência externa, principalmente através de um terminal no HCM.

O HCM possui ainda conectividade externa normal através de ISP/fibra.

#### 6.1 Comunicação local — ordem de preferência

1. Rádio PtP.
2. 4G/5G, quando existir conectividade entre os **dois extremos**.

#### 6.2 Conectividade externa do HCM — ordem de preferência

1. ISP/fibra.
2. 4G/5G.
3. Satélite.

#### 6.3 Regra fundamental de resiliência

A comunicação local e o acesso à Internet são dois serviços diferentes. É possível manter a comunicação local HCM ↔ Guaxene pelo rádio PtP mesmo quando a Internet externa não está disponível.

**O satélite instalado apenas no HCM não consegue restabelecer, sozinho, a comunicação com Guaxene se o PtP e o 4G/5G estiverem indisponíveis.** Essa distinção deve estar refletida no motor de simulação, no dashboard e nas animações.

---

## PARTE III — STACK TECNOLÓGICA

### 7. Tecnologias aprovadas

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js · React · TypeScript · Tailwind CSS · shadcn/ui |
| Backend | Python · FastAPI · Pydantic · NumPy (quando necessário) |
| Mapa 2D | Leaflet / React Leaflet |
| Mapa 3D | CesiumJS (Three.js apenas quando CesiumJS não for suficiente) |
| Gráficos | **Recharts** (nativo React, leve). D3.js apenas para o perfil altimétrico se o SVG customizado necessário exceder o Recharts. |
| Gestão de estado frontend | **Zustand** (leve, sem boilerplate, adequado à ausência de base de dados) |
| Comunicação | REST para cálculos e cenários · WebSocket apenas quando a simulação temporal exigir envio contínuo de estados |
| Persistência | Sem base de dados · Parâmetros em ficheiro de configuração central · Estado em memória |

Não desenvolver dois mapas 3D independentes. Não implementar uma infraestrutura WebSocket complexa para operações que possam ser resolvidas com chamadas REST.

---

## PARTE IV — IDENTIDADE VISUAL E EXPERIÊNCIA DE UTILIZAÇÃO

### 8. Filosofia de design

Ferramenta profissional de engenharia de telecomunicações. Transmitir: clareza, precisão, fiabilidade, simplicidade, organização, profissionalismo.

**Evitar:** gradientes exagerados · glassmorphism excessivo · cores neon · dezenas de cartões · gráficos decorativos · menus complexos · animações desnecessárias · painéis sobrecarregados.

**Privilegiar:** tipografia legível · hierarquia visual · espaçamento consistente · contraste adequado · indicadores técnicos claros · unidades de medida visíveis · feedback imediato · tooltips explicativos.

A língua da interface deve ser **português**, com terminologia técnica consistente com o relatório.

### 9. Estrutura principal da interface

Página única. Organização:

- **Cabeçalho:** nome do simulador · identificação do projeto · estado geral da rede · alternância modos.
- **Área central (dominante):** mapa 2D ou visualização 3D · posição dos dois pontos · percurso principal · caminhos alternativos · animação discreta do tráfego.
- **Painel lateral:** caminho ativo · potência recebida · SNR · modulação · capacidade · estado da Fresnel · estado energético.
- **Área de controlo:** cenários predefinidos · controlos básicos · parâmetros avançados recolhidos por padrão.
- **Área complementar:** perfil do enlace · cálculos detalhados · histórico de eventos.

### 10. Cores e estados

| Estado | Cor | Hex |
|---|---|---|
| Operacional / NORMAL | Verde | `#22c55e` |
| Degradado / DEGRADADO | Amarelo | `#eab308` |
| Emergência / EMERGÊNCIA | Laranja | `#f97316` |
| Crítico / FALHA | Vermelho | `#ef4444` |
| Indisponível / em espera | Cinzento | `#6b7280` |

**Nunca depender exclusivamente da cor.** O estado também deve aparecer por escrito. Exemplo: «PtP — Operacional».

### 11. Modo de apresentação

Ao ativá-lo: aumentar a legibilidade · esconder controlos avançados · destacar o mapa · mostrar indicadores essenciais · facilitar ativação dos cenários. Funcionar adequadamente ligado a projetor nas resoluções **1366 × 768** e **1920 × 1080**.

### 12. Modo de engenharia

Acesso a: fórmulas · parâmetros RF · perfil do terreno · alturas das antenas · link budget · energia · indicadores completos · registo de eventos.

Os dois modos devem utilizar o mesmo motor matemático e o mesmo estado da simulação.

### 13. Componente "Ver cálculo"

Cada indicador técnico deve ter uma ação «Ver cálculo». Ao selecionar, mostrar um modal com **4 linhas fixas**:

1. **Fórmula** em notação matemática.
2. **Substituição** com os valores atuais.
3. **Resultado** numérico com unidade.
4. **Interpretação** em linguagem natural (ex.: «Margem de 33,95 dB — enlace muito robusto para as condições atuais»).

---

## PARTE V — MOTOR MATEMÁTICO

### 14. Regra geral

Todos os cálculos devem ser implementados no backend Python. Separar claramente: valores de entrada · premissas académicas · constantes físicas · valores calculados · valores de referência do relatório.

Não implementar cálculos independentes e contraditórios em diferentes componentes do frontend. Não arredondar os valores durante os cálculos intermédios.

### 15. Configuração RF oficial

Ficheiro central: `backend/app/config/project_config.json`

| Parâmetro | Valor |
|---|---|
| Distância RF | 3,69 km |
| Frequência | 5,8 GHz |
| Largura de canal | 20 MHz |
| Potência conduzida Tx (P_Tx) | 3 dBm |
| Ganho da antena Tx (G_Tx) | 34 dBi |
| Perda de transmissão (L_Tx) | 1 dB |
| EIRP | 36 dBm |
| Ganho da antena Rx (G_Rx) | 34 dBi |
| Perda de receção (L_Rx) | 1 dB |
| Perdas adicionais (L_misc) | 1 dB |
| Capacidade crítica mínima | 15 Mbps |
| Autonomia mínima | 72 h |
| Altura antena HCM (H_A) | **[extrair do relatório técnico aprovado] m** |
| Altura antena Guaxene (H_B) | **[extrair do relatório técnico aprovado] m** |
| Elevação do terreno HCM | **[extrair do relatório técnico aprovado] m** |
| Elevação do terreno Guaxene | **[extrair do relatório técnico aprovado] m** |

> **Nota sobre P_Tx = 3 dBm:** este valor resulta do dimensionamento inverso a partir do limite de EIRP (36 dBm) com antenas de 34 dBi: P_Tx = EIRP − G_Tx + L_Tx = 36 − 34 + 1 = 3 dBm. O AF-5XHD suporta potências superiores, mas o projeto opera com esta potência reduzida para respeitar o limite regulatório de EIRP. **Este valor NÃO deve ser alterado pelo agente.**

> **Nota sobre H_A e H_B:** sem as alturas das antenas, o perfil altimétrico, a verificação de LOS e a visualização 3D não podem ser inicializados corretamente. Extrair do relatório técnico aprovado antes de iniciar a Fase 2. Enquanto não disponíveis, usar valores ilustrativos identificados explicitamente como tal (ex.: H_A = 15 m, H_B = 10 m) e registar aviso no dashboard.

### 16. Comprimento de onda

```
λ = c / f
c = 299 792 458 m/s
f = frequência em Hz
```

Para 5,8 GHz: **λ ≈ 0,0517 m ≈ 5,17 cm**

### 17. Perda em espaço livre — FSPL

```
FSPL(dB) = 32,44 + 20·log₁₀(d_km) + 20·log₁₀(f_MHz)
```

Para d = 3,69 km, f = 5800 MHz: **FSPL ≈ 119,05 dB**

O simulador deve atualizar este resultado quando a distância ou a frequência mudar.

### 18. Primeira zona de Fresnel

```
F₁(x) = √( λ · d₁ · d₂ / (d₁ + d₂) )
```

Todas as distâncias em metros. No ponto médio: d₁ = d₂ = 1845 m.

- Raio máximo: **F₁,max ≈ 6,91 m**
- Folga de projeto (60%): **0,6 × 6,91 ≈ 4,14 m**

Apresentar separadamente o raio máximo e a folga de 60%. Não apresentar a folga como altura do mastro. O motor deve calcular a zona ao longo de todo o percurso, não apenas no ponto médio.

### 19. Curvatura terrestre

```
k = 4/3
h_c(x) = d₁ · d₂ / (2 · k · R)
R = raio médio da Terra (6 371 000 m)
```

Saliência equivalente no ponto médio: **≈ 0,20 m**

### 20. Perfil do terreno e LOS

```
H_LOS(x)    = H_A + (x / d) · (H_B − H_A)
H_efetivo(x) = H_terreno(x) + h_c(x)
Clearance(x) = H_LOS(x) − H_efetivo(x)
```

Critério do projeto: **Clearance(x) ≥ 0,6 · F₁(x)** ao longo de todo o percurso.

**Regra sobre dados altimétricos:**
- Não inventar um levantamento topográfico nem apresentar altitudes hipotéticas como medições reais.
- Identificar a origem de quaisquer dados de elevação.
- Permitir trabalhar com um perfil ilustrativo explicitamente identificado.
- Se forem utilizados dados externos (SRTM/Copernicus), indicar a fonte.
- Quando não existirem dados disponíveis, usar o cenário académico predefinido identificado como ilustrativo.

### 21. EIRP

```
EIRP = P_T + G_T − L_T = 3 + 34 − 1 = 36 dBm
```

Valor fixo de dimensionamento. A aplicação poderá informar que representa premissas de projeto, não autorização regulatória para instalação física.

### 22. Link budget e potência recebida

```
P_R = EIRP − FSPL + G_R − L_R − L_misc − L_ambiente
```

**L_ambiente = 0 dB no cenário base (Cenário 1 — operação normal).**

Nos cenários 6 (chuva intensa) e 7 (degradação RF), L_ambiente é modificado pelo modelo de atenuação correspondente. Nos controlos avançados, o utilizador pode ajustar L_ambiente diretamente. Todos os outros termos da equação permanecem constantes exceto quando ajustados explicitamente.

Para o cenário de referência:
```
P_R = 36 − 119,05 + 34 − 1 − 1 − 0 = −51,05 dBm
```

Não descontar novamente as perdas de transmissão que já foram incorporadas no EIRP.

### 23. SNR

```
SNR(dB) = P_R(dBm) − P_N(dBm)
P_N(dBm) = −174 + 10·log₁₀(B_Hz) + NF
B = 20 × 10⁶ Hz
```

**NF (figura de ruído):** extrair do datasheet do AF-5XHD e registar no ficheiro de configuração.

> **SNR é calculado para fins informativos.** Não controla a seleção de modulação, que é determinada exclusivamente pela Fade Margin (FM). Apresentar SNR no painel de engenharia. Distinguir corretamente: P_R em dBm · P_N em dBm · SNR em dB.

### 24. Sensibilidade do recetor

Valores de referência do AF-5XHD para canal de 20 MHz:

| Modulação | Sensibilidade |
|---|---|
| QPSK MIMO | −85 dBm |
| 16-QAM MIMO | −81 dBm |
| 64-QAM | −75 dBm |
| 256-QAM | −69 dBm |
| 1024-QAM | −63 dBm |

Manter estes valores associados ao equipamento e à configuração de referência. Não extrapolar para outras larguras de canal.

### 25. Margem de desvanecimento (Fade Margin)

```
FM = P_R − S
S = sensibilidade do modo escolhido
```

Para P_R = −51,05 dBm:

| Modulação | FM |
|---|---|
| QPSK MIMO | 33,95 dB |
| 16-QAM MIMO | 29,95 dB |
| 64-QAM | 23,95 dB |
| 256-QAM | 17,95 dB |
| 1024-QAM | 11,95 dB |

**FM é o critério de seleção de modulação.** Não usar SNR para este fim.

### 26. Modulação adaptativa

Sequência de adaptação para a demonstração principal: **64-QAM → 16-QAM → QPSK**

Implementar histerese ou estabilização temporal para evitar mudanças contínuas. Identificar limiares de simulação como premissas académicas, não especificações do fabricante.

### 27. Capacidade

- Requisito mínimo crítico: **15 Mbps úteis**
- Meta de operação normal: **50 Mbps ou mais**
- Referência QPSK MIMO / 20 MHz: **24,32 Mbps por direção**

Distinguir: capacidade de referência do modo · capacidade útil estimada · tráfego solicitado · tráfego efetivamente atendido. Se aplicado fator de overhead, documentar a premissa.

### 28. Modelo de tráfego crítico

| Serviço | Tráfego |
|---|---|
| Voz / VoIP | 0,4 Mbps |
| Vídeo / telecoordenação | 3,0 Mbps |
| Dados e ficheiros | 5,0 Mbps |
| Alertas e sinalização | 0,5 Mbps |
| Margem de projeto | ~4,1 Mbps |
| **Total (requisito)** | **15 Mbps** |

A margem de dimensionamento não é tráfego efetivamente transmitido.

### 29. QoS e VLANs

Ordem de prioridade: Voz e alertas → Dados de saúde → Vídeo e telecoordenação → Internet geral.

| VLAN | Função |
|---|---|
| VLAN 10 | Emergência |
| VLAN 20 | Saúde |
| VLAN 30 | Administração |
| VLAN 40 | Internet |

**Funcionalidade expressamente excluída:** alocação dinâmica da largura de banda em passos de 2 Mbps · aumento automático do canal RF por saturação · balanceamento automático de tráfego PtP/4G como expansão de capacidade.

---

## PARTE VI — ENERGIA E AUTONOMIA

### 30. Modelo energético

Autonomia mínima de projeto: **72 horas** sem fornecimento da EDM. A bateria assegura esta autonomia. A geração solar funciona como apoio e extensão — não como garantia das 72 h mínimas.

Parâmetros comuns: **DoD = 80% · η = 90% · margem = 20%**

### 31. Energia em Guaxene

| Parâmetro | Valor |
|---|---|
| Carga de referência | 30 W |
| Energia em 72 h | 2160 Wh |
| Bateria dimensionada | 3,6 kWh |
| Potência solar | 300–400 Wp |

### 32. Energia no HCM

| Parâmetro | Valor |
|---|---|
| Carga em contingência | 100 W |
| Energia em 72 h | 7200 Wh |
| Bateria dimensionada | 12 kWh |
| Potência solar | 0,8–1,0 kWp |

### 33. Autonomia calculada

```
Autonomia = E_bateria × DoD × η / P_carga
```

| Local | Cálculo | Resultado |
|---|---|---|
| HCM | 12 000 × 0,8 × 0,9 / 100 | **86,4 h** |
| Guaxene | 3 600 × 0,8 × 0,9 / 30 | **86,4 h** |

Os 86,4 h correspondem à autonomia calculada com margem de dimensionamento incluída. O requisito obrigatório permanece 72 h.

### 34. Simulação temporal da energia

Atualizar energia armazenada ao longo do tempo simulado considerando: potência consumida · energia inicial · DoD · eficiência · disponibilidade da EDM · produção solar · equipamentos adicionais em contingência.

Quando a EDM falhar: verificar bateria → alimentar equipamentos → atualizar autonomia restante → considerar solar → desligar se energia útil esgotada.

Permitir **acelerar o tempo de simulação** para demonstrar várias horas em poucos segundos. Indicar claramente a diferença entre tempo real e tempo simulado.

---

## PARTE VII — RESILIÊNCIA E FAILOVER

### 35. Estados do sistema e critérios de transição

| Estado | Critérios de transição |
|---|---|
| **NORMAL** | PtP ativo · FM ≥ 17,95 dB (256-QAM possível) · capacidade ≥ 15 Mbps · energia nominal |
| **DEGRADADO** | PtP ativo mas FM < 17,95 dB (modulação reduzida para 64-QAM ou inferior), **ou** caminho alternativo ativo |
| **EMERGÊNCIA** | PtP inativo · 4G/5G em uso · capacidade ainda ≥ 15 Mbps |
| **CRÍTICO** | PtP inativo · 4G/5G inativo · satélite disponível apenas no HCM · Guaxene sem ligação |
| **FALHA** | Todos os caminhos inativos num extremo, ou equipamentos sem energia |

Os estados devem ser calculados a partir das condições reais do modelo. Não atribuir estados apenas para produzir uma determinada cor.

### 36. Lógica de seleção dos caminhos

**Comunicação local HCM ↔ Guaxene:**
1. PtP (se ativo nos dois extremos)
2. 4G/5G (se ambos os extremos tiverem cobertura)
3. Sem caminho disponível → estado CRÍTICO ou FALHA

**Conectividade externa do HCM:**
1. ISP/fibra
2. 4G/5G
3. Satélite (apenas HCM)

Estas regras devem também considerar o estado energético e a disponibilidade dos equipamentos.

### 37. Cenários predefinidos

Cada cenário tem um contrato de entrada/saída que serve de fonte de verdade para os testes de integração.

#### Cenário 1 — Operação normal
```json
{
  "parametros": { "ptp_ativo": true, "4g_disponivel": true, "isp_ativo": true,
                  "satelite_ativo": true, "edm_ativo": true, "L_ambiente": 0 },
  "estado_esperado": "NORMAL",
  "caminho_local_esperado": "PtP",
  "caminho_externo_esperado": "ISP/fibra"
}
```

#### Cenário 2 — Falha do PtP
```json
{
  "parametros": { "ptp_ativo": false, "4g_disponivel": true, "L_ambiente": 0 },
  "estado_esperado": "DEGRADADO",
  "caminho_local_esperado": "4G/5G",
  "indicadores": { "capacidade_mbps": ">=15", "evento": "failover PtP → 4G/5G" }
}
```

#### Cenário 3 — Falha da rede móvel
```json
{
  "parametros": { "ptp_ativo": true, "4g_disponivel": false, "L_ambiente": 0 },
  "estado_esperado": "NORMAL",
  "caminho_local_esperado": "PtP",
  "nota": "PtP continua a assegurar ligação; rede móvel indisponível não afeta o caminho principal"
}
```

#### Cenário 4 — Falha da Internet externa
```json
{
  "parametros": { "ptp_ativo": true, "isp_ativo": false, "4g_externo": false,
                  "satelite_ativo": true },
  "estado_esperado": "EMERGÊNCIA",
  "caminho_local_esperado": "PtP",
  "caminho_externo_esperado": "Satélite (HCM)",
  "nota": "Guaxene mantém ligação local; Internet do HCM via satélite"
}
```

#### Cenário 5 — Corte de energia (EDM)
```json
{
  "parametros": { "edm_ativo": false, "bateria_hcm_wh": 12000, "bateria_guaxene_wh": 3600 },
  "estado_esperado": "EMERGÊNCIA",
  "indicadores": { "autonomia_hcm_h": 86.4, "autonomia_guaxene_h": 86.4 },
  "nota": "Equipamentos alimentados por bateria; solar como extensão se disponível"
}
```

#### Cenário 6 — Chuva intensa
```json
{
  "parametros": { "ptp_ativo": true, "L_ambiente": "calculado via ITU-R P.838" },
  "estado_esperado": "DEGRADADO",
  "nota": "A 5,8 GHz sobre 3,69 km, L_chuva tipicamente 1–3 dB; valores > 5 dB são matematicamente incorretos"
}
```

**Parâmetros ITU-R P.838 para 5,8 GHz:**
- k_H e α_H: extrair da Tabela 1 do ITU-R P.838-3.
- Taxa de precipitação de referência para Maputo: consultar ITU-R P.837 (tipicamente 50–80 mm/h para excedência de 0,01%).
- Fórmulas: γ_R = k · R^α (dB/km); L_chuva = γ_R × d_ef.

#### Cenário 7 — Degradação RF
```json
{
  "parametros": { "ptp_ativo": true, "L_ambiente": "variável pelo utilizador" },
  "estado_esperado": "DEGRADADO ou CRÍTICO conforme FM",
  "nota": "Observar impacto no SNR, na modulação e na margem"
}
```

#### Cenário 8 — Situação crítica
```json
{
  "parametros": { "ptp_ativo": false, "4g_disponivel": false, "satelite_ativo": true },
  "estado_esperado": "CRÍTICO",
  "caminho_local_esperado": "Nenhum",
  "nota": "Satélite apenas no HCM não restabelece ligação com Guaxene — Guaxene isolada"
}
```

#### Cenário 9 — Recuperação
```json
{
  "sequencia": ["restaurar PtP", "restaurar 4G/5G", "restaurar ISP", "restaurar EDM"],
  "estado_final_esperado": "NORMAL",
  "nota": "Cada passo deve produzir evento no registo e atualizar o dashboard"
}
```

### 38. Disponibilidade

O relatório estabelece a meta de disponibilidade ≥ 99,9%. Apresentar como objetivo de engenharia, não como disponibilidade já comprovada. Não gerar automaticamente 99,9% sem modelo que a sustente.

---

## PARTE VIII — MAPA 2D E VISUALIZAÇÃO 3D

### 39. Mapa 2D (Leaflet)

Representar: HCM · EPC Guaxene · percurso PtP · caminho alternativo 4G/5G · conectividade externa do HCM · estado dos equipamentos · distância RF.

Os marcadores devem apresentar informações técnicas relevantes. A alteração do cenário deve atualizar a representação do caminho ativo.

### 40. CesiumJS (Mapa 3D)

Mostrar: localização dos extremos · terreno (quando disponível) · posição e altura das antenas · percurso do enlace · LOS · zona de Fresnel 3D · estado da ligação.

A câmara deve oferecer vista geral do enlace e permitir aproximação a cada extremo. Evitar movimentos exagerados.

**Estratégia offline para a defesa académica:**
- Pré-calcular array de ≥ 50 amostras de elevação SRTM/Copernicus ao longo do percurso e guardar em `project_config.json`. Estas amostras são a fonte primária para o perfil 2D.
- Token Cesium Ion: armazenar em variável de ambiente. Se ausente, CesiumJS usa terreno Ellipsoid (plano) e exibe aviso — **a demonstração não pode depender do token estar válido**.
- Se CesiumJS falhar completamente: preservar a aplicação, mostrar mensagem clara, disponibilizar visualização 2D alternativa, manter cálculos e controlos funcionais.

### 41. Zona de Fresnel em 3D

Representar como volume tridimensional translúcido. A geometria deve depender de frequência, distância e posição ao longo do enlace. Indicar visualmente: folga suficiente · folga reduzida · obstrução.

### 42. Perfil técnico do enlace

Gráfico com: perfil do terreno · LOS · zona de Fresnel · limite de 60% · antenas · obstáculos · ponto crítico de desobstrução. Usar os mesmos dados do motor de engenharia. Quando o utilizador alterar a altura da antena, atualizar simultaneamente cálculos, gráfico e 3D.

### 43. Animação de tráfego

Implementar como **círculos SVG animados via CSS keyframes** ao longo da polilinha Leaflet, com intervalo de ≈ 2 s, cor dependente do estado da rede. A animação deve:
- Seguir o caminho realmente ativo.
- Parar quando o caminho estiver indisponível.
- Mudar para o caminho alternativo quando ocorrer failover.

Não representar transmissão bem-sucedida num caminho que o motor classifica como indisponível.

---

## PARTE IX — INTERAÇÃO E FUNCIONALIDADES

### 44. Painel de indicadores (modo apresentação)

Estado geral · caminho local ativo · caminho externo ativo · distância · frequência · P_R · SNR · modulação · capacidade útil estimada · tráfego solicitado · estado da Fresnel · autonomia energética.

### 45. Controlos básicos

Seleção de cenário · Iniciar · Pausar · Reiniciar · Restaurar configuração oficial · Alternar mapa 2D/3D · Alternar apresentação/engenharia.

Os controlos devem produzir ações reais. Não criar botões decorativos.

### 46. Controlos avançados (modo engenharia)

Frequência · potência de transmissão · ganho das antenas · perdas · altura das antenas · ruído · L_ambiente (chuva/obstáculos) · estado dos caminhos de comunicação · estado da EDM · energia das baterias · produção solar · tráfego solicitado.

Cada controlo deve indicar unidade e limites válidos. Os valores alterados devem ser enviados ao motor de simulação via API.

### 47. Registo de eventos

Histórico técnico com timestamps. Exemplos: simulação iniciada · PtP operacional · falha detetada · caminho alternativo selecionado · alteração de modulação · corte da EDM · alimentação por bateria · satélite ativado · comunicação restabelecida.

Os eventos devem resultar de mudanças reais no estado do modelo.

### 48. Segurança (representação conceptual)

Representar como elementos da arquitetura proposta: AES-256 no enlace de rádio · VPN entre os routers · VLANs · QoS. Identificar explicitamente que o simulador não estabelece ligações de produção.

---

## PARTE X — ARQUITETURA DE SOFTWARE

### 49. Estrutura de pastas (monorepo)

```
simulador/
├── backend/
│   ├── app/
│   │   ├── config/
│   │   │   └── project_config.json     # ÚNICA fonte de verdade para valores numéricos
│   │   ├── models/                     # Modelos Pydantic tipados
│   │   ├── engine/
│   │   │   └── rf_calculator.py        # PRIMEIRO ficheiro a criar
│   │   ├── scenarios/                  # Contratos JSON dos 9 cenários
│   │   └── api/                        # Endpoints FastAPI
│   └── tests/
│       └── test_rf_calculator.py       # PRIMEIRO ficheiro de testes
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── store/                      # Zustand
└── README.md
```

### 50. Ficheiro de configuração central

`backend/app/config/project_config.json` (JSON, UTF-8). Contém todos os parâmetros das Partes V, VI e VII como chaves agrupadas por subsecção: `rf`, `energy`, `geography`, `scenarios`. Os modelos Pydantic carregam e validam este ficheiro no arranque. **Não usar variáveis de ambiente para parâmetros físicos do projeto.**

### 51. Modelos de dados (Pydantic)

`ProjectConfiguration` · `GeographicPoint` · `RadioConfiguration` · `SimulationInput` · `LinkBudgetResult` · `FresnelResult` · `CapacityResult` · `EnergyState` · `NetworkState` · `ScenarioDefinition` · `SimulationResult` · `SimulationEvent`

Validar entradas, unidades e intervalos aceitáveis.

### 52. Endpoints FastAPI

```
GET  /api/config                    → ProjectConfiguration
POST /api/calculate/link-budget     → LinkBudgetResult
POST /api/calculate/fresnel         → FresnelResult
POST /api/calculate/energy          → EnergyState
GET  /api/scenarios                 → List[ScenarioDefinition]
POST /api/scenarios/{id}/run        → SimulationResult
POST /api/simulation/reset          → SimulationResult
GET  /api/simulation/state          → SimulationResult
WS   /ws/simulation                 → stream de SimulationEvent (apenas durante execução ativa)
```

Evitar endpoints redundantes para cálculos que possam ser executados numa única operação coerente.

### 53. Gestão de estado

Fonte única de verdade para o estado da simulação. Todas as visualizações devem acompanhar a mesma transição. Não pode ocorrer que: o mapa apresente PtP operacional enquanto o dashboard apresenta PtP indisponível.

### 54. Simulação temporal

Distinguir: tempo real da interface · tempo decorrido no cenário simulado. O modelo deve funcionar de forma determinística e ser testável. Evitar dependência de temporizadores imprecisos para cálculos energéticos.

---

## PARTE XI — FIABILIDADE DA DEMONSTRAÇÃO

### 55. Funcionamento sem Internet

O motor matemático, a configuração oficial, o dashboard, os cenários, a energia, o failover, o registo de eventos e os gráficos calculados **devem funcionar completamente sem ligação à Internet**.

Quando os mapas ou dados de terreno dependerem de serviços externos, apresentar alternativa local claramente identificada. A falta de Internet não deve impedir a execução dos cenários de resiliência.

### 56. Sequência de demonstração guiada (3–5 minutos)

1. Apresentar os dois pontos no mapa.
2. Mostrar o enlace PtP de 3,69 km.
3. Apresentar os indicadores principais (P_R, FM, modulação, capacidade).
4. Demonstrar o link budget com "Ver cálculo".
5. Mostrar a LOS e a zona de Fresnel.
6. Ativar Cenário 2 — falha no PtP → failover para 4G/5G.
7. Restabelecer o PtP.
8. Ativar Cenário 4 — falha da Internet externa → contingência satélite.
9. Ativar Cenário 5 — corte da EDM → alimentação por bateria.
10. Mostrar a evolução da autonomia com tempo acelerado.
11. Restaurar o funcionamento normal (Cenário 9).

A sequência deve usar estados coerentes, sem ativar caminhos previamente indisponibilizados.

---

## PARTE XII — TESTES E VALIDAÇÃO

### 57. Testes matemáticos (unitários)

Implementar para: Haversine · comprimento de onda · FSPL · Fresnel · curvatura terrestre · LOS · clearance · EIRP · link budget · SNR · FM · capacidade · consumo energético · autonomia.

### 58. Valores de referência obrigatórios

| Resultado | Valor esperado |
|---|---|
| Distância RF de projeto | 3,69 km |
| λ para 5,8 GHz | 0,0517 m |
| FSPL | ≈ 119,05 dB |
| Fresnel máxima (ponto médio) | ≈ 6,91 m |
| 60% da Fresnel | ≈ 4,14 m |
| Curvatura no ponto médio | ≈ 0,20 m |
| EIRP | 36 dBm |
| P_R | ≈ −51,05 dBm |
| FM QPSK | ≈ 33,95 dB |
| Requisito crítico | 15 Mbps |
| Autonomia mínima de projeto | 72 h |
| Autonomia calculada de referência | 86,4 h |

Os testes devem comparar com tolerâncias adequadas (ex.: `abs(resultado - esperado) < 0.01`), não exigir igualdade exata entre floats.

### 59. Testes de integração (cenários)

Para cada um dos 9 cenários verificar: estado correto · caminho correto · indicadores coerentes · visualização correspondente · eventos adequados.

### 60. Testes de interface

Validar: layout nas resoluções prioritárias · legibilidade em projetor · alternância 2D/3D · modo apresentação · modo engenharia · alteração de parâmetros · restaurar valores oficiais · funcionamento sem Internet · mensagens de erro · ausência de controlos inoperantes.

### 61. Critério de qualidade

Não considerar a aplicação concluída apenas porque o frontend abre sem erros. O projeto estará funcional quando os cálculos, os cenários e a visualização forem consistentes entre si e com o relatório académico.

---

## PARTE XIII — PLANO DE DESENVOLVIMENTO

### 62. Estratégia geral

Desenvolver de forma incremental. Cada fase produz uma versão executável e testável. Não avançar para funcionalidades visuais avançadas enquanto os cálculos e estados essenciais apresentarem erros.

### Fase 1 — Preparação e arquitetura

**Objetivos:** analisar requisitos · definir arquitetura · criar estrutura de pastas · configurar frontend e backend · criar `project_config.json` · definir modelos de dados · preparar ambiente.

**Critério de aceitação:** estrutura de pastas criada · `project_config.json` com todos os parâmetros oficiais · modelos Pydantic definidos · ambiente de desenvolvimento funcional.

### Fase 2 — Motor matemático

**Implementar em `rf_calculator.py`:** Haversine · λ · FSPL · Fresnel ao longo do percurso · curvatura terrestre · LOS · clearance · EIRP · P_R · SNR · FM · capacidade · energia · autonomia.

**Critério de aceitação:** todos os testes unitários passam com os valores de referência da Parte XII. Nenhum ficheiro de frontend criado antes desta fase estar concluída.

### Fase 3 — Backend e lógica de resiliência

**Implementar:** FastAPI com todos os endpoints da Parte X · validação de entradas Pydantic · máquina de estados com critérios de transição da Parte VII · contratos dos 9 cenários · seleção de caminhos · registo de eventos.

**Critério de aceitação:** todos os endpoints respondem corretamente verificado via curl/Postman · testes de integração dos 9 cenários passam.

### Fase 4 — Simulador funcional (sem mapa)

**Implementar:** interface principal · dashboard · painel de indicadores · controlos de cenário · estados da rede · componente "Ver cálculo" · registo de eventos · alternância modos.

**Critério de aceitação:** demonstração dos principais cenários possível sem mapa, a 1366×768.

### Fase 5 — Visualização 2D

**Implementar:** Leaflet · localização dos pontos · enlace · estados visuais · caminhos alternativos · animação de tráfego (SVG/CSS) · perfil técnico do enlace (Recharts).

**Critério de aceitação:** mapa atualiza em resposta a mudanças de cenário · animação segue caminho ativo.

### Fase 6 — Visualização 3D

**Implementar:** CesiumJS · posicionamento geográfico · antenas · LOS · terreno ou perfil ilustrativo identificado · Fresnel 3D · estados visuais · fallback offline.

**Critério de aceitação:** visualização 3D funcional com dados do motor · fallback ativo quando token Cesium ausente.

### Fase 7 — Simulação temporal e refinamento

**Implementar ou concluir:** atualização energética ao longo do tempo · tempo simulado vs. real · evolução da bateria · registo de eventos com timestamps · transições de estado · atualizações via WebSocket quando necessário.

**Critério de aceitação:** Cenário 5 demonstrável com aceleração do tempo.

### Fase 8 — Modo de defesa

**Implementar:** modo apresentação · sequência demonstrativa da Parte XI · layout para projetor · alternativas offline para mapas · contingência para falha do 3D.

**Critério de aceitação:** sequência de 3–5 minutos executável sem Internet, a 1366×768.

### Fase 9 — Testes finais

Executar: testes matemáticos · testes de integração · testes de cenários · testes visuais · comparação com o relatório · ensaio da apresentação.

**Critério de aceitação:** todos os testes passam · sem inconsistências entre motor, dashboard e visualização.

### Fase 10 — Documentação e entrega

**Criar:** README · instruções de instalação · comandos de execução · explicação da arquitetura · documentação dos cálculos · guia dos cenários · limitações conhecidas · guia de demonstração para a defesa.

---

## PARTE XIV — REGRAS DE EXECUÇÃO DO AGENTE

### 63. Método obrigatório de trabalho

**Antes de iniciar cada fase:** explicar o objetivo · identificar os componentes · indicar os ficheiros criados ou modificados · explicar as decisões técnicas · apresentar os critérios de conclusão.

**Depois:** implementar · executar os testes possíveis · corrigir os erros · explicar como executar · apresentar os resultados · indicar o próximo passo.

Não declarar que uma fase está concluída sem verificar os seus critérios de aceitação.

### 64. Qualidade do código

Modular · legível · tipado · testável · coerente com a arquitetura · livre de duplicações desnecessárias. Não introduzir abstrações complexas sem necessidade. Não adicionar dependências apenas por preferência pessoal.

### 65. Segurança no desenvolvimento

Não colocar credenciais, tokens ou chaves em ficheiros públicos do frontend. Usar variáveis de ambiente para: token Cesium Ion · chaves de APIs externas. Validar entradas da API. **O token Cesium Ion nunca deve ser commitado no repositório.**

### 66. Dependências e documentação técnica

Antes de instalar bibliotecas: verificar compatibilidade · preferir versões estáveis · consultar a documentação · identificar requisitos de configuração · justificar dependências pouco comuns. Não inventar APIs ou métodos de bibliotecas.

### 67. Comunicação com o estudante

Explicar de forma clara e profissional. Quando introduzir um conceito novo, explicar: o que é · para que serve · por que foi escolhido · como será utilizado. Evitar explicações excessivas sobre assuntos que não contribuam para a implementação.

### 68. Gestão de alterações

Propostas de melhoria são bem-vindas. Contudo, não alterar unilateralmente: a arquitetura híbrida · a distância de referência · os parâmetros RF aprovados · a finalidade académica · a autonomia mínima · a stack principal · os cenários essenciais · a prioridade do relatório e da defesa.

---

## PARTE XV — RESULTADO FINAL ESPERADO

### 69. Experiência durante a defesa

Ao abrir o simulador, o público identifica imediatamente o Hospital Central de Maputo e a EPC Guaxene. O enlace principal aparece destacado. O painel indica os parâmetros mais importantes. O apresentador demonstra:

> *«Este é o Hospital Central de Maputo, e este é o centro de acomodação de Guaxene. Os dois pontos estão ligados por um enlace rádio ponto-a-ponto de aproximadamente 3,69 km, operando no nosso modelo académico a 5,8 GHz.»*

Seguido de: FSPL · P_R · zona de Fresnel · FM · capacidade · autonomia.

Depois: falha no PtP → failover · falha de energia → bateria · falha externa → satélite · todos os caminhos indisponíveis → estado crítico demonstrado corretamente.

O objetivo não é impressionar com efeitos visuais. É demonstrar, com clareza, que as decisões de engenharia resultam numa arquitetura capaz de preservar a comunicação perante diferentes falhas.

### 70. Critérios definitivos de aceitação

O projeto só estará concluído quando:

- [ ] Os resultados numéricos correspondem ao dimensionamento aprovado.
- [ ] O motor matemático está testado com os valores de referência.
- [ ] O dashboard reflete corretamente o estado do sistema.
- [ ] Os 9 cenários de falha funcionam com os contratos definidos.
- [ ] O failover respeita os caminhos realmente disponíveis.
- [ ] A autonomia energética é calculada corretamente.
- [ ] O mapa 2D está operacional.
- [ ] A visualização 3D cumpre a finalidade técnica prevista.
- [ ] Os dados ilustrativos estão identificados como tal.
- [ ] O modo apresentação está funcional a 1366×768 sem Internet.
- [ ] A sequência de demonstração de 3–5 minutos é executável de forma fiável.
- [ ] A interface está simples, organizada e profissional.
- [ ] A documentação permite instalar e executar o projeto.

---

## PRIMEIRA INSTRUÇÃO — COMEÇAR AGORA

Antes de escrever qualquer código:

1. Analisa integralmente este prompt.
2. Verifica a coerência dos requisitos.
3. **Confirma os valores de H_A e H_B** (alturas das antenas) com o estudante ou extrai do relatório técnico aprovado. Se não disponíveis, usar valores ilustrativos identificados como tal.
4. Apresenta a arquitetura técnica final.
5. Define os módulos do motor Python.
6. Explica a integração entre FastAPI, Next.js, Leaflet, CesiumJS e Zustand.
7. Apresenta a estrutura de pastas definitiva.
8. Identifica as dependências necessárias.
9. Define os modelos de dados.
10. Define a estratégia de gestão de estado.
11. Explica como serão executados e testados os cálculos.
12. Identifica os riscos de implementação e as respetivas soluções.
13. Organiza o trabalho segundo as 10 fases estabelecidas.

**Depois dessa preparação, inicia a Fase 1.**

Não te limites a propor ideias: produz código funcional, executa os testes disponíveis, corrige problemas e orienta o desenvolvimento até à conclusão do simulador.

**Princípio central: rigor de engenharia, simplicidade de utilização e fiabilidade da demonstração.**
