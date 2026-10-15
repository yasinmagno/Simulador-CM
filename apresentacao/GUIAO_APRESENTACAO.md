# Guião da Apresentação — Rede Resiliente HCM ↔ Guaxene

Comunicação Móvel · ISCTEM · 2026

## Como usar este guião

A apresentação dura cerca de **20 minutos**: 15 minutos de exposição e 5 de demonstração do simulador, seguidos das perguntas do júri. A divisão por oradores abaixo é uma proposta; ajustem os nomes conforme combinarem.

| Parte | Conteúdo | Orador (proposta) | Tempo |
| --- | --- | --- | --- |
| 1 | Abertura, contexto, cenário e objectivos | Tatyana Ibrahim | 3 min |
| 2 | Tecnologia e dimensionamento do enlace | Yannis Chilundo | 5 min |
| 3 | Arquitectura, energia, segurança e resiliência | Yasin Magno | 4 min |
| 4 | Demonstração do simulador | Yannis Chilundo | 5 min |
| 5 | Custos, conclusão e encerramento | Tatyana Ibrahim | 2 min |

Convenções:

- O texto normal é a **fala**: para dizer com as vossas palavras, não para ler palavra a palavra.
- *[Entre parênteses rectos e em itálico]* estão as **acções**: o que mostrar, apontar ou clicar.
- Os números a destacar estão a **negrito**; são os que o júri deve reter.

---

## Parte 1 — Abertura, contexto, cenário e objectivos (3 min)

### Abertura

*[Slide de capa no ecrã. O grupo de pé, de frente para o júri.]*

Bom dia, Professor Roxan Cadir, bom dia a todos. Somos a Tatyana Ibrahim, o Yannis Chilundo e o Yasin Magno, do 3.º ano de Engenharia Informática. O nosso projecto final de Comunicação Móvel chama-se **Dimensionamento de uma Rede Resiliente de Comunicação** entre o Hospital Central de Maputo e o centro de acomodação de Guaxene.

A pergunta que nos guiou foi simples: se a rede pública falhar, como é que um hospital continua a falar com um centro de acolhimento?

### Contexto

Esta pergunta não é teórica. Em **janeiro de 2026**, durante a época chuvosa, o INCM reportou **centenas de estações-base fora de serviço** em todo o país. As causas foram três: cortes de energia, danos nas ligações de transmissão e dificuldade das equipas em chegar aos locais para manutenção.

O próprio INCM teve de activar soluções por satélite em centros de emergência e de acomodação. Ou seja: quando mais precisávamos de comunicar, as redes públicas estavam em baixo.

### Cenário

*[Apontar para o mapa: primeiro o HCM, depois Guaxene, depois a linha tracejada.]*

Escolhemos dois pontos. O **Ponto A** é o Hospital Central de Maputo, a principal infra-estrutura de saúde do país. O **Ponto B** é a Escola Primária Completa de Guaxene, na KaTembe, que em janeiro de 2026 foi usada como centro de acomodação.

Entre os dois há **3,69 km** em linha recta, através da Baía de Maputo. Pela estrada são cerca de 13 km, mas para o rádio o que conta é a linha recta, porque a onda vai directamente de antena para antena.

A emergência de janeiro serve apenas de motivação. O objectivo é uma solução **permanente** entre duas instituições críticas.

### Objectivos

O objectivo geral é dimensionar uma infra-estrutura que mantenha voz, dados, alertas e coordenação, tanto em operação normal como em falha. Para isso definimos seis objectivos específicos:

1. Caracterizar o enlace e o tráfego.
2. Comparar celular, satélite e rádio ponto-a-ponto.
3. Dimensionar frequência, antenas, potência e margem.
4. Analisar a linha de visada e a zona de Fresnel.
5. Garantir pelo menos **72 horas** de autonomia energética.
6. Definir redundância, segurança e qualidade de serviço.

**Passagem:** O Yannis vai agora explicar que tecnologia escolhemos e como dimensionámos o enlace.

---

## Parte 2 — Tecnologia e dimensionamento do enlace (5 min)

### Escolha da tecnologia

Comparámos três meios de comunicação, e cada um ficou com um papel diferente.

- O **4G/5G** já existe e activa-se depressa, mas depende das estações-base, da energia e do backhaul da operadora. Foi exactamente isso que falhou em janeiro. Fica como **redundância**.
- O **satélite** não depende de nada em terra, mas é mais caro, consome mais e tem mais latência. Fica como **contingência externa**, instalado no HCM.
- O **rádio ponto-a-ponto** liga os dois pontos directamente, com baixa latência, alta capacidade e controlo nosso. A única exigência é ter linha de visada e alinhamento. É o **meio principal**.

### Capacidade

*[Apontar para a linha "Requisito mínimo" da tabela.]*

Antes de escolher o equipamento, calculámos quanto tráfego é crítico: voz, uma sessão de vídeo para telecoordenação, dados de saúde e administrativos, e alertas. Com uma margem de crescimento, o total dá **15 Mbps**. Este é o limiar crítico: abaixo dele não garantimos o serviço. Em operação normal, o objectivo é ter mais de **50 Mbps**.

### Orçamento do enlace

*[Percorrer os quatro cartões da esquerda para a direita.]*

Trabalhámos a **5,8 GHz**, com canal de **20 MHz**. Escolhemos 20 MHz em vez de canais mais largos porque preferimos robustez a capacidade máxima.

1. A 5,8 GHz, o comprimento de onda é de **5,17 cm**.
2. A perda em espaço livre a 3,69 km é de cerca de **119 dB**. É a perda que o sinal sofre só por se espalhar no espaço.
3. Fixámos uma EIRP de **36 dBm**: 3 dBm de potência, mais 34 dBi de ganho da antena, menos 1 dB de perdas.
4. No receptor temos outra antena de 34 dBi e 2 dB de perdas. O resultado é uma potência recebida de **−51 dBm**.

Como referência usámos o rádio Ubiquiti airFiber AF-5XHD.

### Zona de Fresnel

*[Apontar para a elipse laranja no gráfico.]*

Não basta ver a outra antena: o sinal ocupa um volume em forma de elipse à volta da linha recta, a chamada primeira zona de Fresnel. A meio do percurso, o raio dessa zona é de **6,91 m**. A regra é manter pelo menos 60% livre, ou seja **4,14 m** sem obstáculos. A curvatura da Terra, a esta distância, acrescenta apenas **20 cm**. As alturas das antenas têm de garantir esta folga no ponto mais crítico do terreno.

### Modulação e margem

*[Apontar para a linha QPSK, destacada.]*

A margem é a diferença entre o que recebemos e o mínimo que o rádio precisa para cada modulação. O rádio usa **modulação adaptativa**: quando o sinal piora, por exemplo com chuva, desce de 64-QAM para 16-QAM e depois para QPSK.

O ponto importante é este: mesmo no modo mais robusto, QPSK, temos **34 dB de margem** e cerca de **24 Mbps**. Isto está acima dos 15 Mbps críticos. A capacidade baixa antes de a comunicação se perder.

**Passagem:** Com o enlace dimensionado, o Yasin mostra como ele encaixa na arquitectura completa.

---

## Parte 3 — Arquitectura, energia, segurança e resiliência (4 min)

### Arquitectura

*[Percorrer o diagrama de cima para baixo: saída externa, depois os dois locais, depois energia e 4G/5G.]*

A solução tem três camadas. Ao centro, o **rádio PtP** liga o HCM a Guaxene: é o caminho preferido. Por baixo, o **4G/5G** liga os mesmos dois pontos como alternativa. Em cima, o HCM tem saída para a Internet pela fibra e, se ela falhar, por 4G/5G ou **satélite**.

Como as camadas estão separadas, os dois locais continuam a comunicar entre si mesmo sem Internet externa. Cada local tem ainda o seu próprio sistema de energia.

### Energia

O requisito é aguentar **72 horas** sem a rede eléctrica da EDM. Usamos a fórmula E = P × t.

- Em **Guaxene**, a carga é de cerca de 30 W: rádio e router. Em 72 horas são 2,16 kWh. Corrigindo para 80% de profundidade de descarga, 90% de eficiência e margem, chegamos a **3,6 kWh** de bateria e 300 a 400 Wp de solar.
- No **HCM**, com o terminal satélite ligado, a carga sobe para cerca de 100 W. Isso dá **12 kWh** de bateria e 0,8 a 1 kWp de solar.

A bateria é que garante a autonomia; o solar prolonga-a e recarrega-a. Não contamos com sol durante uma tempestade. O simulador confirma **86,4 horas** úteis nos dois locais, acima das 72 exigidas.

### Segurança e QoS

A segurança tem duas camadas: **AES-256** no próprio rádio e uma **VPN** entre os routers. A VPN é importante porque continua a proteger os dados quando o tráfego passa para o 4G/5G.

A rede está dividida em quatro VLANs: emergência, saúde, administração e Internet. Quando a capacidade baixa, a prioridade é: primeiro **voz e alertas**, depois dados de saúde, depois vídeo e, por último, Internet geral.

### Estudo de resiliência

*[Percorrer a tabela linha a linha, devagar.]*

Testámos a arquitectura contra falhas isoladas e combinadas.

- Se falha o 4G, o PtP continua: nada muda para o utilizador.
- Se falha o PtP, o tráfego passa para o 4G/5G: o serviço fica degradado, mas disponível.
- Se falha a Internet externa, o PtP mantém a ligação local e o satélite dá saída no HCM.
- Se falha a energia, entram as baterias e o solar.

A mensagem principal é: **nenhuma falha simples corta a comunicação**. Só se o PtP e o 4G/5G falharem ao mesmo tempo é que Guaxene fica isolada; nesse caso é preciso um terminal portátil local.

**Passagem:** Para ver isto a funcionar, o Yannis vai mostrar o simulador que desenvolvemos.

---

## Parte 4 — Demonstração do simulador (5 min)

*[Mudar para o browser em http://localhost:3000, em modo Apresentação. O simulador deve estar aberto desde o início; ver a checklist no fim.]*

**Introdução (30 s).** O simulador é um complemento visual: os critérios técnicos são os do relatório, e o simulador reproduz os mesmos cálculos. O backend em Python faz a matemática de rádio, de energia e a máquina de estados, e tem **79 testes automáticos**, todos a passar. O frontend mostra os resultados. No topo está o diagrama de estados: Normal, Degradado, Emergência, Crítico e Falha.

Sequência sugerida (botão "Próximo" ou escolher o cenário):

| Passo | Cenário | Estado esperado | O que apontar | O que dizer |
| --- | --- | --- | --- | --- |
| 1 | 1 — Operação normal | Normal | Pacotes no caminho PtP; escada de modulação no painel direito | "Tudo ligado: o tráfego segue pelo rádio PtP." |
| 2 | 2 — Falha do PtP | Degradado | PtP a vermelho com ✕; pacotes passam para o 4G/5G | "O rádio cai e a rede comuta sozinha para o 4G/5G." |
| 3 | 5 — Corte de energia | Emergência | Edifícios sem EDM; bateria a descer; gráfico das baterias | "Sem EDM, as baterias aguentam 86,4 horas, acima das 72 pedidas." |
| 4 | 7 — Degradação RF | Degradado | Degrau aceso na escada de modulação; capacidade vs. linha dos 15 Mbps | "Com +10 dB de atenuação a modulação desce, mas continuamos acima dos 15 Mbps." |
| 5 | 8 — Situação crítica | Crítico | Alerta "Guaxene isolada"; borda do mapa a pulsar | "Só com duas falhas ao mesmo tempo é que Guaxene fica isolada." |
| 6 | 9 — Recuperação | Normal | Estado volta a Normal | "Repostos os sistemas, a rede volta ao estado normal." |

**Vista 3D (1 min).** *[Clicar em 3D no canto do mapa; o voo pelo enlace começa sozinho no modo Apresentação.]* Aqui vê-se o enlace sobre a baía e a primeira zona de Fresnel como um elipsóide à volta da linha de visada. O exagero vertical é só visual; os cálculos usam a geometria real.

**Se houver tempo ou se o júri pedir:**

- *[Botão Σ Fórmulas]* "Todas as fórmulas do relatório, com os valores do cenário actual já substituídos."
- *[Construir cenário]* Combinar falhas ao vivo: desligar o PtP e a EDM de Guaxene e saltar para as 48 h.
- *[Modo Engenharia]* Mostrar margem, comprimento de onda, curvatura e SNR.

**Passagem:** De volta aos slides, a Tatyana fecha com os custos e a conclusão.

---

## Parte 5 — Custos, conclusão e encerramento (2 min)

### Custos

A solução usa apenas componentes comerciais. Estimámos um custo total entre **8 500 e 14 400 dólares**. Estes valores são faixas académicas, não uma cotação. A maior parte vai para a energia (baterias e solar), o terminal satélite e a instalação dos mastros; os rádios são a parte mais barata.

A mesma arquitectura pode ser replicada noutros hospitais, escolas e centros de acomodação.

### Conclusão

Para concluir, quatro números resumem o projecto:

- **−51 dBm** recebidos a 3,69 km e 5,8 GHz;
- **34 dB** de margem, mesmo no modo QPSK;
- **24 Mbps** em QPSK, acima dos 15 Mbps críticos;
- **72 horas** de autonomia sem a rede eléctrica.

Com o PtP como ligação principal, o 4G/5G como redundância e o satélite como contingência, mais failover, VLANs, QoS e cifra, **pelo menos um caminho sobrevive a qualquer falha simples**. A propagação, a capacidade, a energia e a resiliência são coerentes entre si, e o simulador permite demonstrá-lo.

### Encerramento

*[Slide "Obrigado". Deixar o simulador aberto noutra janela para responder às perguntas.]*

Muito obrigado pela vossa atenção. Estamos disponíveis para as vossas perguntas.

---

## Preparação para perguntas do júri

Respostas curtas: uma ou duas frases, e depois mostrar no simulador quando ajudar.

| Pergunta provável | Resposta curta |
| --- | --- |
| Porquê 5,8 GHz e não 2,4 GHz? | A zona de Fresnel é menor, há muitos equipamentos direccionais e a banda está menos congestionada. A atribuição deve ser confirmada no Plano Nacional de Atribuição de Frequências do INCM. |
| E a chuva? | A 5,8 GHz e a 3,69 km a atenuação da chuva é pequena (modelo ITU-R P.838-3). No simulador, a chuva intensa soma 2,5 dB, e temos 34 dB de margem em QPSK. |
| De onde vem a EIRP de 36 dBm? | É uma premissa académica fixada para o dimensionamento: 3 dBm + 34 dBi − 1 dB. Numa implementação real, teria de respeitar o limite regulamentar. |
| Qual é a altura das antenas? | Não fixámos uma altura arbitrária. A regra é: a folga no ponto crítico tem de ser maior que 4,14 m (60% de Fresnel). A altura final sai do levantamento do terreno real. |
| O percurso passa sobre a baía. E a reflexão na água? | O relatório não modela a reflexão na água. Na implementação, mitiga-se com o ajuste da altura das antenas ou com diversidade espacial, e a margem de 34 dB absorve parte do desvanecimento. |
| Porquê 86,4 h se o requisito é 72 h? | 12 kWh × 80% de descarga × 90% de eficiência ÷ 100 W = 86,4 h. O mesmo cálculo dá 86,4 h em Guaxene (3,6 kWh e 30 W). A diferença é margem acima das 72 h. |
| E se o PtP e o 4G/5G falharem ao mesmo tempo? | É o estado Crítico: Guaxene fica sem caminho directo. A contingência é um terminal portátil local. Mostrar o cenário 8. |
| Garantem 99,9% de disponibilidade? | É uma meta de engenharia, não uma garantia estatística: não temos histórico de falhas. A arquitectura elimina pontos únicos de falha. |
| Porque não usar só satélite? | Custa mais, consome mais energia e tem mais latência. Fica como saída externa de contingência no HCM. |
| Os custos são reais? | São faixas académicas de referência, não uma cotação comercial. |
| O simulador decide alguma coisa? | Não. Os critérios são os do relatório; o simulador reproduz os cálculos e os estados, e foi validado com 79 testes. |

---

## Checklist antes da defesa

- [ ] Corrigir o tráfego no `project_config.json`: os serviços somam 13 Mbps, mas o relatório diz 15 Mbps.
- [ ] Correr `iniciar_apresentacao.bat` pelo menos 10 minutos antes e abrir http://localhost:3000 em modo Apresentação.
- [ ] Testar a vista 3D no computador da sala (precisa de WebGL); sem Internet, o mapa usa o NaturalEarth.
- [ ] Ensaiar os 6 passos da demonstração e cronometrar: 5 minutos no máximo.
- [ ] Ter os slides e o simulador em janelas separadas e treinar a troca entre os dois (Alt+Tab).
- [ ] Combinar quem responde a que tipo de pergunta: rádio e simulador (Yannis), arquitectura e energia (Yasin), contexto e custos (Tatyana).
- [ ] Fazer um ensaio completo com cronómetro: 20 minutos no total.
