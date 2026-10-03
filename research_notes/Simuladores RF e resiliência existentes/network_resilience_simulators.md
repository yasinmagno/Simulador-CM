# Network simulators/emulators for resilience, failover and emergency communications (positioning a web simulator for a hospital-shelter hybrid network in Maputo)

Research date: 2026-10-03. Note on method: several primary PDFs (ETC situation reports on etcluster.org) returned HTTP 403 to automated fetch. Facts from them come only from search-result snippets and are flagged as such.

## 1. Open-source discrete-event simulators: ns-3 (LENA/5G-LENA, SNS3, energy) and OMNeT++ (INET, Simu5G)

### Takeaway
ns-3 and OMNeT++ are the academic reference tools. Together they cover every technology in our design: LTE/5G (5G-LENA, Simu5G), GEO satellite (SNS3), batteries and solar harvesting (ns-3 energy framework) and scripted link or node failures (INET ScenarioManager). They are C++ code- or config-driven, have a steep learning curve, and offer no built-in "failure-state machine" dashboard. That gap is the one our web simulator fills.

### Cited Findings
**ns-3 core**
- ns-3 is an open-source discrete-event simulator for research and education. It is a C++ framework for packet-level simulators, licensed GPLv2 — [Magister/ESA SNS3 paper context, arXiv 2502.13704](https://arxiv.org/pdf/2502.13704)

**5G-LENA (ns-3 NR module)**
- 5G-LENA is a pluggable ns-3 module that simulates 3GPP 5G NR end to end, from the application layer down to PHY — [ns-3 App Store: nr](https://apps.nsnam.org/app/nr); [5G-LENA site](https://5g-lena.cttc.es/)
- It evolved from LENA (the LTE/EPC simulator) but started from the mmWave module, for beamforming, TDD, the 3GPP channel model and FR2. It is aligned with 3GPP NR Rel-15 and later — [5G-LENA site](https://5g-lena.cttc.es/)
- CTTC maintains both LENA (LTE) and 5G-LENA (NR). The code is GPLv2 at gitlab.com/cttc-lena/nr. There is an NR V2X branch and an NR-U module — [CTTC LENA/5G-LENA](https://www.cttc.cat/?p=12164); [5G-LENA download](https://5g-lena.cttc.es/download/); [Zenodo record](https://zenodo.org/records/15830121)
- NIST has published work on site-specific cellular simulation that drives ns-3 with ray tracing. This is relevant for realistic urban propagation — [NIST publication](https://www.nist.gov/publications/enabling-site-specific-cellular-network-simulation-through-ray-tracing-driven-ns-3)

**SNS3 (satellite extension of ns-3)**
- SNS3 models a fully interactive GEO multi-spot-beam network with a transparent (bent-pipe) payload, using DVB-S2(X)/DVB-RCS2 stacks. It was developed in an ESA project and an open-source version exists — [arXiv 2502.13704](https://arxiv.org/pdf/2502.13704); [Magister Solutions SNS3 ESA SESP 2015](https://indico.esa.int/event/93/contributions/3557/attachments/2836/3293/04.JaniPuttonen_MagisterSolutions_SNS3_SESP_2015.pdf)
- Recent SNS3 work adds 3GPP NR-NTN elements (Bessel beam patterns, antenna models, frequency-reuse schemes) so it can be compared with 5G NTN — [arXiv 2502.13704](https://arxiv.org/pdf/2502.13704)

**ns-3 Energy Framework (relevant to our 72 h battery+solar model)**
- The framework has three parts: energy sources (batteries/capacitors), device energy (consumption) models, and energy harvesters (solar panels, chargers) — [ns-3 Energy docs](https://www.nsnam.org/docs/models/html/energy.html)
- Source models:
  - BasicEnergySource is ideal and linear, mainly for testing.
  - GenericBatteryModel follows Tremblay's model for Li-Ion, Lead-Acid, NiCd and NiMH, with rate-capacity and recovery effects.
  - RvBatteryModel is a non-linear Li-Ion model ported from ns-2, with reported issues.
  - Source: [ns-3 Energy docs](https://www.nsnam.org/docs/models/html/energy.html)
- WifiRadioEnergyModel draws current per radio state (Idle, CcaBusy, Tx, Rx, ChannelSwitch, Sleep, Off). When a source is depleted, it notifies the device models, and the WiFi PHY is powered down by default — [ns-3 Energy docs](https://www.nsnam.org/docs/models/html/energy.html)
- BasicEnergyHarvester works only with BasicEnergySource. The framework does not model battery aging or temperature, and device coverage is limited — [ns-3 Energy docs](https://www.nsnam.org/docs/models/html/energy.html)
- Literature describes a basic harvester (random, time-varying power) and a harvester fed by real solar-panel measurement datasets — [arXiv 1406.6265](https://www.arxiv.org/pdf/1406.6265)

**OMNeT++ / INET / Simu5G**
- Simu5G is an OMNeT++ model library, interoperable with INET (the TCP/IP stack) and Veins. It was built from SimuLTE (4G), so it can simulate 4G-5G coexistence — [Simu5G GitHub](https://github.com/Unipisa/Simu5G); [OMNeT++ Simu5G page](https://omnetpp.org/download-items/Simu5G.html)
- Simu5G simulates the 5G RAN and core data plane in FDD/TDD, with X2 handover between gNBs, D2D and dual connectivity. It is configured at run time through omnetpp.ini — [Simu5G paper, SCITEPRESS 2020](https://www.scitepress.org/Papers/2020/98264/pdf/index.html)
- INET's ScenarioManager runs an XML script of timed commands: set-param, set-channel-param, connect, disconnect, create-module, delete-module, and the lifecycle commands initiate, shutdown, crash and start. The documented example disconnects a link at t=60 s and crashes or restarts routers to study transient behaviour. This is the native way to script "PtP failure" or "power cut" events — [INET ScenarioManager NED doc](https://doc.omnetpp.org/inet/api-current/neddoc/inet.common.scenario.ScenarioManager.html)
- Simu5G has also been used for rapid prototyping of MEC applications — [arXiv 2203.13511](https://arxiv.org/pdf/2203.13511)

### Inferences
- Our timeline of states (normal, then mobile failure, then PtP failure, and so on) maps directly onto an INET ScenarioManager script (disconnect, then crash) or onto ns-3 `Simulator::Schedule` events. We can cite these as the "professional-grade" counterpart of our state machine.
- Our 72 h autonomy and solar model is conceptually the same as ns-3 Energy Framework sources plus harvesters, but at the site and power-plant level, not the radio-state level. ns-3 models radio consumption per transceiver state, not a hospital UPS.
- Neither tool offers browser-based, non-programmer interaction. That is the positioning niche for an academic web simulator.

### Gaps
- I did not verify current details of the NetAnim (ns-3 animator) and Qtenv (OMNeT++ GUI) visualisation features in this session. Consult nsnam.org/wiki/NetAnim and the omnetpp.org manual.
- I found no source for a ready-made ns-3 "5.8 GHz PtP" model. Such a link would usually be modelled with WiFi 802.11a/ac plus a point-to-point or propagation-loss configuration, but this is unverified.

## 2. Emulators and teaching labs: Mininet/Mininet-WiFi, GNS3, EVE-NG, Cisco Packet Tracer, CORE/EMANE

### Takeaway
Emulators run real protocol stacks (OSPF/BGP/VPN failover on real router images, SDN controllers) and are good for testing VLAN, VPN and routing failover. Wireless and cellular realism is limited, except in EMANE and Mininet-WiFi. Packet Tracer is the easiest, with free 3G/4G cell tower objects, but it is Cisco-only and abstract.

### Cited Findings
- **Mininet-WiFi** (UNICAMP, Fontes et al.) is a fork of the container-based Mininet that adds virtual WiFi stations and APs while keeping SDN/OpenFlow. It runs on commodity hardware through kernel-level virtualisation. Its results have been compared with a real wireless testbed — [Fontes et al., CNSM 2015](https://dl.ifip.org/index.html/db/conf/cnsm/cnsm2015sdn/1570196959.pdf); [INTRIG paper](https://intrig.dca.fee.unicamp.br/wp-content/papercite-data/pdf/fontes2015towards.pdf); [SIGCOMM 2016 demo](https://www.dca.fee.unicamp.br/~chesteve/pubs/2016-SIGCOMM-Demo-Mininet-WiFi.pdf)
- **Cisco Packet Tracer** is free through Cisco Networking Academy. It has a very easy learning curve (rated 2/10) and runs on a 4 GB laptop, but supports Cisco devices only — [CloudMyLab GNS3 vs PT](https://blog.cloudmylab.com/gns3-vs-packet-tracer); [NetworksTraining](https://www.networkstraining.com/?p=7119)
- Packet Tracer has cellular objects: Cell Tower, Central Office Server (which provides DHCP to phones), and a Cisco 819 ISR with 3G/4G WAN plus an internal AP. You configure it with `cellular 0 gsm profile` IOS commands, so 4G backhaul labs are possible — [PT help: Other Devices](https://tutorials.ptnetacad.net/help/default/devicesAndModules_others.htm); [packettracernetwork.com 819](https://packettracernetwork.com/features/packet-tracer-6-2.html); [Cisco Community thread](https://community.cisco.com/t5/routing/how-to-configuring-a-cell-tower-on-central-office-server-packet/m-p/3833124/highlight/true)
- **GNS3** is free, but vendor images such as IOS are obtained separately. It is multi-vendor (Cisco, Juniper, Arista, Palo Alto, Linux), harder to learn (rated 7/10) and needs 16 GB+ RAM — [CloudMyLab](https://blog.cloudmylab.com/gns3-vs-packet-tracer)
- **EVE-NG** is freemium (Community and paid Pro editions) and runs on Linux only — [NetworksTraining](https://www.networkstraining.com/?p=7119); [TrustRadius PT vs EVE-NG](https://trustradius.com/compare-products/cisco-networking-academy1-vs-eve-ng-ltd)
- Academic comparisons of PT, GNS3 and EVE-NG exist — [Acta Electrotechnica et Informatica 2023](https://reference-global.com/article/10.2478/aei-2023-0011); [ASEE paper](https://peer.asee.org/26285.pdf)
- **CORE** (Common Open Research Emulator) has a GUI, a services layer and an API. **EMANE** (developed by NRL Code 5522 and Adjacent Link LLC) emulates PHY and MAC in real time, including propagation, antenna profiles and interference. The two link through TAP devices: CORE handles L3+ and EMANE handles L1-L2 — [NRL EMANE](https://www.nrl.navy.mil/Our-Work/Areas-of-Research/Information-Technology/NCS/EMANE/); [CORE EMANE doc](https://docs.rs/crate/coreemu/latest/source/core/docs/emane.md); [CORE paper (UNICAMP copy)](https://www.ic.unicamp.br/~nfonseca/MO648/doc/core.pdf)

### Inferences
- A Packet Tracer lab could replicate our VLAN/VPN/QoS layer and the 4G backup (819 ISR plus Cell Tower). It cannot model 5.8 GHz link-budget degradation, satellite latency or energy. Our simulator can position itself as filling those three gaps.

### Gaps
- I did not verify the current Packet Tracer version (9.x?) or whether it has satellite or 5G objects.
- I did not retrieve the Mininet-WiFi licence (believed BSD-like) or its propagation-model list.

## 3. Commercial suites: MATLAB/Simulink toolboxes, Riverbed Modeler (ex-OPNET), Keysight EXata/QualNet, NetSim (Tetcos)

### Takeaway
The commercial tools offer polished GUIs, link-budget apps and "digital twin" emulation, but they are expensive. Riverbed Modeler, a historical academic staple, is discontinued. NetSim's cheap Academic edition excludes 5G and satellite.

### Cited Findings
- **MATLAB Satellite Communications Toolbox** covers orbit propagation and constellation visualisation, time-varying visibility and link-budget scenarios, and BER/PER analysis. It provides DVB-S2/S2X/RCS2, GPS, CCSDS and 5G NTN waveforms. The **Satellite Link Budget Analyzer app** gives no-code link budgets with sensitivity and availability analysis — [MathWorks Satellite Communications Toolbox](https://www.mathworks.com/products/satellite-communications.html); [MathWorks: What is a link budget](https://www.mathworks.com/discovery/link-budget.html)
- The 5G NTN channel lets the Satellite Toolbox and 5G Toolbox work together for space-based 5G links — [MathWorks Satellite Communications Toolbox](https://www.mathworks.com/products/satellite-communications.html)
- **Riverbed Modeler (ex-OPNET):** the Academic Edition (v17.5, formerly free to universities) was discontinued on 1 Sep 2020, and existing users could keep using it until 1 Sep 2023. Riverbed stopped selling Modeler itself in 2022 — [Wikipedia: OPNET](https://en.wikipedia.org/wiki/OPNET); [TrustRadius](https://www.trustradius.com/compare-products/mininet-vs-riverbed-modeler)
- **Keysight EXata** builds a "network digital twin" for real-time simulation and emulation. It uses a software virtual network (SVN) covering protocol layers, antennas and devices, with hardware-in-the-loop interoperation with real radios. The latest listed version is EXata 8.3.2.0 (19 May 2026, Windows) — [Keysight EXata Network Modeling](https://www.keysight.com/ca/en/lib/software-detail/computer-software/exata-network-modeling.html); [EXata datasheet](https://www.keysight.com/fi/en/assets/3122-1406/data-sheets/EXata-Network-Modeling.pdf)
- **NetSim (Tetcos)** comes in Academic, Standard and Pro editions:
  - Academic, for teaching labs, includes LTE but not 5G/6G or satellite.
  - Standard, for academic R&D, and Pro, for defence and industry, add 5G and satellite.
  - An Emulator add-on connects real hardware.
  - Sources: [NetSim edition comparison](https://www.tetcos.com/version-comparison.html); [NetSim v14.4 manual](https://www.tetcos.com/documentation/v14.4/NetSim_User_Manual/NetSim.html); [NetSim 5G NTN doc](https://www.tetcos.com/downloads/v14.4/5G-NTN.pdf)

### Inferences
- MATLAB's Link Budget Analyzer is the closest commercial analogue to a "link margin / availability" panel for our 5.8 GHz PtP and satellite links. Our simulator could reproduce a simplified version (FSPL plus rain fade) in the browser for free.

### Gaps
- I did not verify QualNet's current branding or status relative to EXata, or Keysight pricing. Keysight does not publish prices.
- I did not retrieve MATLAB academic licence prices.

## 4. Emergency/disaster communications: tools, frameworks, availability modelling, digital twins

### Takeaway
The humanitarian sector (ETC, ITU, GSMA) mainly uses mapping and coordination tools, such as the Disaster Connectivity Map, rather than simulators. Resilience is quantified with RBD and Markov availability (MTBF/MTTR) tools, which are mostly commercial. Telecom disaster digital twins are an emerging research area.

### Cited Findings
- The **ITU/ETC Disaster Connectivity Map** is a joint ITU and ETC initiative supported by GSMA. It provides real-time information on the type, level and quality of connectivity after disasters, to guide where to restore services. Its users are governments, humanitarian agencies, the private sector and communities — [ITU DCM User Guide Jul 2023](https://dcm.itu.int/docs/ITU_DisasterConnectivityMaps_UserGuide_EN_Jul2023.pdf); [ITU DCM concept note](https://itu.int/en/ITU-D/Emergency-Telecommunications/Documents/2019/GET_2019/Partnerships-for-Saving-Lives-Disaster-Connectivity-Map-Concept-Note.pdf)
- ETC describes "three transformative tools" for strengthening connectivity in disasters — [ETC blog](https://etcluster.org/blog/three-transformative-tools-are-strengthening-connectivity-networks-disasters) (content not fetched; title only)
- **Digital twin example:** UTS and TPG Telecom secured a AUD 1.3 M grant (Nov 2025) for a cloud-based "Disaster Resilience Digital Twin". It integrates historical and real-time environmental and network data for flood-risk forecasting and telecom resource optimisation — [UTS news](https://www.uts.edu.au/news/2025/11/uts--tpg-telecom-partnership-secures-$1.3m-tdri-grant)
- **Availability modelling:** RBDs represent component interconnections, and Markov models are used for repairable systems. Availability is expressed with MTBF and MTTR. Tools include RAScad (graphical Markov, semi-Markov and RBD), Relyence RBD and Isograph Availability Workbench (commercial). Isograph also has "Network Availability Prediction", an extended RBD for telecom networks — [Redalyc paper](https://www.redalyc.org/pdf/6617/661770100001.pdf); [Relyence RBD brochure 2026](https://relyence.com/wp-content/uploads/2026/04/Relyence-RBD-Brochure.pdf); [Isograph](https://www.isograph.com/?p=24)
  - Caution: one search snippet gave availability as (MTBF−MTTR)/MTBF. The standard steady-state formula is A = MTBF/(MTBF+MTTR). Verify against a textbook before use.
- EENA held a webinar on "Resilient Digital Infrastructures for Emergency Management" — [EENA](https://eena.org/webinar/resilient-digital-infrastructures-for-emergency-management/)

### Inferences
- Our state machine (normal through total failure) is a discrete-state model similar to a Markov availability chain. Adding per-link MTBF/MTTR would let the simulator compute steady-state availability of the hybrid design. For example, parallel links give A = 1 − Π(1 − A_i), and this can be shown next to the visual states.

### Gaps
- I found no open-source, telecom-specific RBD or Markov web calculator in this session.
- I did not retrieve GSMA "Mobile Network Resilience" or ITU-T L.392/L.1700-series disaster-resilience recommendations. They are worth a follow-up.
- I did not find a public-safety-specific simulator such as a FirstNet/3GPP MCPTT simulator. ns-3 has public-safety LTE (D2D/ProSe) work from NIST, but this was not verified here.

## 5. Web-based/interactive simulators that show failover states visually

### Takeaway
Browser-based educational network simulators exist, mostly for topology and packet visualisation. Very few model hybrid radio, cellular and satellite failover together with energy autonomy in a state-diagram dashboard. This supports the novelty claim of our project.

### Cited Findings
- An academic web-based interactive network simulator for university networking courses was built with JavaScript, Node.js and WebSocket. It offers topology assembly, virtual device configuration and real-time traffic visualisation — [Dinotech Journal (USP)](https://jurnal.usp.ac.id/index.php/dinotech-journal/article/view/222)
- Hobby or hackathon projects such as the "Internet Broke Simulator" visualise failure propagation (kill nodes/edges, cascading waves) in a single-page app — [Hack Club Stardance project](https://stardance.hackclub.com/projects/28091); [AI Tinkerers hackathon entry](https://la.aitinkerers.org/hackathons/h_f21Jtztdrn8/teams/ht_OLOW5BMk5AM). These are not peer-reviewed.
- Earlier visualisation-based educational simulators exist — [SCITEPRESS 2011](https://scitepress.org/Papers/2011/33095/pdf/index.html); [Univ. Bern BKS08](https://home.inf.unibe.ch/~rvs/research/pub_files/BKS08.pdf)

### Inferences
- Peer-reviewed work combining (a) a multi-bearer failover state machine, (b) energy autonomy and (c) a browser UI appears scarce. Our tool can be positioned as a pedagogical and decision-support layer above heavyweight simulators such as ns-3 and OMNeT++.

### Gaps
- I did not search systematically for IEEE/MDPI papers on "web-based resilience dashboard telecom". A follow-up search is recommended.

## 6. Telecom disruptions in Mozambique: Cyclone Idai (2019) and the 2025-26 floods

### Takeaway
In both disasters, the failure modes were the ones our scenarios model: cell sites lost to power and damage, fibre cuts and access problems. The response relied on satellite (BGAN, GX, VSAT, and Starlink in 2026), coordinated by the ETC under the Crisis Connectivity Charter. This directly justifies our satellite contingency and 72 h power design.

### Cited Findings
**Cyclone Idai (March 2019, Beira)**
- After the 14 March rains, the ETC activated the UN Crisis Connectivity Charter. Inmarsat partner IEC Telecom deployed BGAN terminals and IsatPhone 2 satellite phones — [Inmarsat](https://www.inmarsat.com/news/satellite-connectivity-supports-cyclone-idai-relief-effort/)
- Télécoms Sans Frontières (TSF) installed an Inmarsat Global Xpress terminal at Beira airport 48 h after landfall. Within two days, users rose from 350 to 796 and data from 41 GB to over 118 GB — [Inmarsat](https://www.inmarsat.com/news/satellite-connectivity-supports-cyclone-idai-relief-effort/); [TSF SitRep 01](https://www.tsfi.org/en/our-missions/disaster-response/cyclone-idai/cyclone-idai-situation-report-01/@@download/file_document/TSF_Cyclone-Idai_SitRep01_20190325.pdf)
- Eutelsat, Inmarsat and SES provided services under the Charter. SES described restoring communications via satellite — [SES blog](https://www.ses.com/blog/restoring-communications-disaster-stricken-mozambique-satellite)
- ETC situation reports #3, #4, #8, #13 and #14 and the Global ETC teleconference minutes (19 Mar 2019) are available — [ETC SitRep #4](https://www.etcluster.org/sites/default/files/documents/Mozambique%20-%20ETC%20Situation%20Report%20%234_0.pdf); [ETC SitRep #14](https://www.etcluster.org/sites/default/files/documents/ETC%20Mozambique%20SitRep%20%2314.pdf); [Minutes 2019-03-19](https://www.etcluster.org/sites/default/files/documents/2019-03-19_Minutes-Global%20ETC%20Mozambique%20teleconference.pdf) (the PDFs returned 403 to automated fetch; contents not verified)
- **Movitel** (a Viettel joint venture; one search summary wrongly called it Vodacom's) lost 273 BTS, and about 290,000 subscribers were disconnected. It reported 75% of BTS recovered by late March 2019 and over 80% later. One article dates this to "May 2025", which looks like a page-date artefact; treat the timing cautiously — [PR Newswire / Viettel](https://www.prnewswire.co.uk/news-releases/viettel-becomes-the-only-telecommunications-provider-to-recover-services-in-mozambique-following-intense-tropical-cyclone-idai-853239007); [QDND](https://en.qdnd.vn/economy/military-businesses/viettel-restores-services-in-mozambique-after-cyclone-idai-513969)
- Vodafone Foundation "Instant Network" volunteers from Hungary, Portugal, Romania and the Netherlands helped Vodacom Mozambique restore its network — [Vodafone Foundation](https://foundation.vodafone.com/news/vodafone-foundation/volunteers-instant-network-cyclone-idai)
- Other coverage: [ITWeb Africa](https://itweb.africa/content/xA9POvNZPwLvo4J8); [Connecting Africa](https://www.connectingafrica.com/connectivity/telecom-playing-critical-role-in-aftermath-of-cyclone-idai); [WFP story](https://www.wfp.org/stories/restoring-communications-and-hope-mozambique)

**2025-26 southern Mozambique floods (Limpopo/Incomati basins, Gaza and Maputo provinces)**
- Weeks of rain in Dec 2025 and Jan 2026 overwhelmed reservoirs. By 30 Jan 2026 there were 146 deaths and about 30,000 homes damaged or destroyed, and the floods were described as the worst in a generation (compared with 1997) — [Wikipedia: 2025–26 Mozambique floods](https://en.wikipedia.org/wiki/2025%E2%80%9326_Mozambique_floods)
- The ETC reports that flooding "severely disrupted telecommunications... particularly in Gaza Province, causing site failures, fibre-optic cuts, power losses, and major access constraints". The government and operators deployed Starlink terminals, satellite phones, free emergency packages and rapid-response teams — [ETC Mozambique Floods page](https://etcluster.org/emergency/mozambique-floods); [ETC Sitrep #3, 5 Feb 2026](https://new.etcluster.org/sites/default/files/documents/ETC%20Mozambique%20Sitrep%20%233_5%20February%202026_0.pdf) (snippet-level; the PDF returned 403)
- TSF ran connectivity missions in Mozambique — [TSF Mozambique](https://www.tsfi.org/our-actions/missions/programmes/connectivite/pays/MA|mz|pt)

### Inferences
- The observed failure chain was power loss, then site failure, then fibre cut, with satellite as the last resort. It maps onto our states: "power cut", then "mobile failure" and "external failure", then "critical", with satellite contingency. Citing Idai and the 2026 Gaza floods gives strong local grounding.
- Movitel's restoration timeline (about 75% in roughly 10 days) gives a rough empirical MTTR scale for cellular infrastructure after a major cyclone. It could parametrise "mobile failure" duration.

### Gaps
- I could not access the full ETC sitreps (403). Exact numbers for 2026 (sites down per operator, ETC users served, Starlink units deployed) remain unverified.
- I found no source on whether Maputo city hospitals specifically lost connectivity in 2026.
- I found no academic (IEEE/MDPI) study quantifying Mozambique telecom resilience after Idai.
