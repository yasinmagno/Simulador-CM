# Educational and web-based RF / link-budget simulators and open-source map-based link planners (as of Oct 2026)

Context: inspiration for an academic FastAPI + Next.js + CesiumJS simulator of a 3.69 km, 5.8 GHz PtP link in Maputo (FSPL, Fresnel, earth curvature, link budget, fade margin, adaptive modulation, failure scenarios, presentation vs engineering mode).

Method note: ~17 tool calls (web search + fetch). Several vendor calculator pages could not be fetched (everythingRF returned HTTP 403), so some calculators listed in the brief are in Gaps rather than findings.

## 1. Online calculators (link budget, FSPL, Fresnel, earth curvature)

### Takeaway
Most online calculators are single-purpose forms (inputs, then a number) with at most a static diagram and the formula. Good examples show the formula next to the result and a diagram (Pasternack), or add the 60% Fresnel rule and earth bulge at midpoint (L-com). None of the ones checked combine a live chart, an animated Fresnel zone and a map. That gap is where the project can stand out.

### Cited Findings
- **Pasternack RF calculators** (link budget, FSPL, Friis, VSWR/return loss, noise, dBm/W conversion, attenuation, wavelength, microstrip and others). Each calculator page includes "a diagram or illustrated depiction of what the calculator is used for, as well as the mathematical formula". Product-oriented calculators add a "Find Related Products" button, so they are commercial lead generation, not teaching tools. — [Fierce Electronics](https://www.fiercesensors.com/iot-wireless/calculators-and-conversion-tools-ease-complex-rf-design-work); Friis tool: [pasternack.com](https://pasternack.com/t-calculator-friis.aspx)
- **L-com Fresnel Zone Clearance calculator** computes the first-zone radius at an obstacle, the 60% Fresnel rule for unobstructed paths and earth bulge at the midpoint. It notes that links longer than about 3 km may have ground-clearance problems, which matters for our 3.69 km link. — [L-com](https://www.l-com.com/resources/wireless-calculators/fresnel-zone-clearance-calculator)
- **Firgelli "interactive" engineering calculators**: a Fresnel Zone calculator (radius of the ellipsoidal clearance zone) and an Earth Curvature calculator (horizon distance, hidden height, LOS range, bulge height, dip angle, required target height, with Earth radius as an input). — [Fresnel](https://www.firgelliauto.com/en-nl/blogs/engineering-calculators/fresnel-zone-calculator), [Earth curvature](https://www.firgelliauto.com/es/blogs/engineering-calculators/earth-curvature-calculator)
- **RF Cafe Fresnel zone page / Espresso Engineering Workbook** includes a Fresnel zone calculator that takes earth curvature into account. — [RF Cafe](https://rfcafe.com/references/electrical/fresnel-zone.htm)
- **AfNOG 2017 "Link Budget Calculation" workshop slides**: teaching material in the classic step-by-step style (Tx power, then gains/losses, then Rx level, then margin). — [AfNOG PDF](https://www2.ws.afnog.org/afnog2017/cne/pdf/06-Link-Budget-Calculation.pdf)
- **Rust crate `linkbudget`** (docs.rs, v0.6.2) is a programmatic link-budget library, evidence that code libraries exist beyond web forms. — [docs.rs](https://docs.rs/crate/linkbudget/0.6.2)

### Inferences
- The "formula plus diagram plus result" pattern (Pasternack) is the baseline. Our engineering mode should beat it with live substitution of values into the formula, e.g. FSPL = 32.44 + 20 log10(3.69) + 20 log10(5800) = ~119 dB, recomputed as sliders move.
- L-com's ">3 km may need earth-bulge check" rule is a good teaching hook, since our link sits just over that threshold.

### Gaps
- everythingRF link budget calculator page returned HTTP 403, so its inputs and outputs were not verified.
- Huber+Suhner, Kyrio, "Wireless Calculator" and radio-electronics.com calculators were not checked (out of tool budget). No ITU-hosted interactive link-budget calculator was found.

## 2. Vendor/web PtP planners with path profile (strongest UX references)

### Takeaway
The best visual references for our 2D mode are vendor path-profile tools. They all use the same layout: a map to pick endpoints, a side-view profile chart with terrain, the LOS line, the first-Fresnel ellipse and the 60% clearance band, then predicted signal, throughput and margin.

### Cited Findings
- **Ubiquiti airLink** (free, web, link.ubnt.com): click map endpoints, choose radio model and frequency from a dropdown, set antenna heights, gain and Tx power. The path profile shows distance, LOS, the Fresnel zone and the 60% clearance area, with colour-coded link quality, signal levels and predicted throughput. — [AREDN docs](https://arednmesh-es.readthedocs.io/en/latest/arednNetworkDesign/network_modeling.html)
- **Cambium LINKPlanner**: a single-page web app designed for laptop/desktop screens. It uses path profiles to predict data rates and reliability as you adjust antenna height and RF power. Models: ITU-R P.526-10/-14 (diffraction, with/without clutter) and ITU-R P.530-12/-17 or Vigants-Barnett for availability. Users can add obstructions and edit path profiles. — [LINKPlanner Concepts](https://lp.cambiumnetworks.com/doc/linkplanner_concepts.html); [Cambium community](https://community.cambiumnetworks.com/t/how-to-add-obstructions-and-edit-path-profiles/40031)
- **CloudRF path profile**: a chart plots the terrain profile, LOS and Fresnel zone between two points. A "raise" button lifts the receiver just enough to clear 60% of the first Fresnel zone, a strong interactive "fix it" affordance. — [CloudRF docs](https://cloudrf.com/pnut/docs/path-profiles); CloudRF also has a blog on over-the-horizon microwave links: [CloudRF](https://cloudrf.com/modelling-microwave-links-over-the-horizon/)
- **HeyWhatsThat Path Profiler**: pick endpoints on a map to get a path profile. When a frequency is given it draws the Fresnel zone. — [heywhatsthat.com/profiler.html](http://heywhatsthat.com/profiler.html), per [AREDN docs](https://arednmesh-es.readthedocs.io/en/latest/arednNetworkDesign/network_modeling.html)
- **Radio Mobile Online (VE2DBE)**: path profiles report free-space loss, obstruction loss, forest loss, urban loss and **fade margin**, plus colour-coded coverage plots. — [ve2dbe.com](http://www.ve2dbe.com/rmonline.html), per [AREDN docs](https://arednmesh-es.readthedocs.io/en/latest/arednNetworkDesign/network_modeling.html)
- **Infinet InfiPLANNER**: visualizes the path profile, flags first-Fresnel obstruction and computes expected link capacity for LoS and near/non-LoS, combining ITU-R P.540 (sic, as stated by vendor) and Longley-Rice. — [Infinet](https://infinetwireless.com/news/infiplanner-radio-planning-tool)
- **HFCL LinkXpert**: a PtP planner covering power losses, terrain profile and Fresnel zones. — [HFCL](https://io.hfcl.com/linkxpert)

### Inferences
- Copy these patterns: (a) a profile chart under or beside the map, (b) red/amber/green link verdict, (c) a CloudRF-style "raise antenna to clear 60% F1" button, (d) capacity/throughput from SNR, which maps to our adaptive-modulation table.
- None of these are open source or academic. They are closed vendor tools, so we can borrow their UX ideas but not their code.

### Gaps
- Licences and exact tech stacks of airLink, LINKPlanner, CloudRF and InfiPLANNER were not documented in the sources (they are proprietary/SaaS).

## 3. Open-source map-based link planners (GitHub)

### Takeaway
The most mature open-source reference is **Meshtastic Site Planner** (GPL-3.0; TypeScript + Vite + MapLibre GL + SPLAT! ITM compiled to WebAssembly). The closest in spirit to our project is **urwb-link-planner** (MIT, p5.js 3D Fresnel ellipsoid, live link budget and fade-margin verdict). Many small student "RF link planner" repos (React + Leaflet + Fresnel) exist. No open-source Cesium-based Fresnel/PtP planner was found.

### Cited Findings
- **Meshtastic Site Planner** — [github.com/meshtastic/meshtastic-site-planner](https://github.com/meshtastic/meshtastic-site-planner); hosted at site.meshtastic.org ([docs](https://meshtastic.org/docs/software/site-planner/), [intro blog](https://meshtastic.org/blog/meshtastic-site-planner-introduction/))
  - Computes ITM/Longley-Rice coverage (SPLAT! itwom3.0 compiled to WASM, running on a pool of Web Workers, fully client-side with no server). Also does point-to-point link analysis with Fresnel-zone clearance.
  - Stack: TypeScript, Vite, MapLibre GL. Terrain is NASA SRTM tiles streamed from AWS Open Data and cached in the browser. It is a PWA that works offline after first load.
  - UX: device presets, "hilltop finder", coverage stats, heatmap or vector iso-contour overlays with live recolouring, multi-site, 6 basemaps, export to GeoJSON/PNG+world file/KML, shareable URLs that encode parameters.
  - Limitations: 90 m terrain (30 m high-res option, 30 km max), ignores trees and buildings, isotropic antennas only.
  - Licence: GPL-3.0.
- **meshtastic_linkplanner** (predecessor): Python Flask + Leaflet + Docker, SRTM data, ITM model, MIT licence. **Archived** in Feb 2025 and replaced by Site Planner. — [GitHub](https://github.com/meshtastic/meshtastic_linkplanner)
- **wadegerencser/urwb-link-planner**: a 3D PtP backhaul planner for Cisco IW9165/IW9167.
  - Single self-contained HTML file using p5.js from a CDN, with no build step.
  - Renders the first Fresnel zone as an ellipsoid along the LOS, with the 60% clearance core drawn as rings. It turns red when obstructed. Vertical scale is exaggerated 4x for visibility while all maths uses true geometry.
  - Computes EIRP, FSPL (32.44 + 20log d_km + 20log f_MHz), RSSI and fade margin. Verdict: green at >=10 dB margin with F1 100% clear, red below 6 dB.
  - UX: draggable poles, antenna lobe visualization, live verdict each frame, 2D side-profile chart, PNG export.
  - Licence: MIT. — [GitHub](https://github.com/wadegerencser/urwb-link-planner)
- **Dan7ares/microwave-link-planner**: an offline Python script (NumPy + Matplotlib), not a web app. It applies ITU-R P.530-17, P.838-3 (rain), F.386-10 and F.636-5 to produce a link budget, Fresnel clearance over real terrain, rain fade, availability and a PNG profile. The case study is a 110 km double-hop link in the Colombian Andes. MIT licence. — [GitHub](https://github.com/Dan7ares/microwave-link-planner)
- **Student "RF Outdoor Link Planner" repos** (JavaScript, 0 stars each): shivpujan12, ashik536 (React + Leaflet), Avanthi242004, gladiatorr22, Mohammadabbas254, JAMUNARAMESH07. They place towers, draw links and show the first Fresnel zone on a map, apparently from a common assignment. — [GitHub search "fresnel link planner"](https://github.com/search?q=fresnel+link+planner&type=repositories)
- **Leaflet.Elevation** (MrMufflon): a Leaflet plugin that draws an interactive d3 height profile for polylines. It is a ready-made building block for a 2D elevation-profile panel. — [GitHub](https://github.com/MrMufflon/Leaflet.Elevation)
- **AREDN** network-design docs point amateur users to airLink, Radio Mobile and HeyWhatsThat, not to their own planner. — [AREDN docs](https://arednmesh-es.readthedocs.io/en/latest/arednNetworkDesign/network_modeling.html)

### Inferences
- The Meshtastic approach (client-side compute, terrain cached in the browser, shareable URL state) shows a fully static architecture is viable. For a single fixed 3.69 km link our FastAPI backend is fine, but URL-encoded scenario state is worth copying for "presentation mode" deep links.
- urwb's 4x vertical exaggeration plus "true maths" is directly reusable. At 3.69 km and 5.8 GHz, the first Fresnel radius at mid-path is only about 6.9 m (r = 17.32·sqrt(d1·d2/(f·d)) with d in km and f in GHz). That would be invisible in a 3D globe without exaggeration.
- Licence caution: borrowing code from Meshtastic Site Planner (GPL-3.0) would force GPL on derived code. urwb and Dan7ares are MIT and safer to adapt.

### Gaps
- Projects named "wisp-link-planner", "line-of-sight" or "rf-planner" were not verified individually. Searches did not surface a specific notable repo by those names.
- No open-source project using Mapbox/MapLibre Terrain-RGB tiles for LOS was confirmed in this pass.
- deck.gl-based link planners: none found (only a deck.gl terrain-layer issue: [visgl/deck.gl#1215](https://github.com/visgl/deck.gl/issues/1215)).

## 4. CesiumJS for LOS / Fresnel / telecom digital twins

### Takeaway
Open-source CesiumJS has terrain sampling but no built-in LOS or viewshed. Those come with the commercial **Cesium ion SDK**. Rendering a Fresnel ellipsoid between two points is an open community question with no off-the-shelf answer, so the project has to build it (e.g. a custom geometry or a tube of per-segment ellipses oriented along the link). Telecom examples on Cesium (Blare Tech 5G) focus on coverage heatmaps over 3D Tiles, not Fresnel.

### Cited Findings
- `sampleTerrain` and `sampleTerrainMostDetailed` query a terrain provider for heights at cartographic positions and return promises. The MostDetailed variant uses the highest available terrain level. This is the standard way to build an elevation profile in CesiumJS. — [CesiumJS ref doc](https://cesium.com/learn/cesiumjs/ref-doc/global.html#sampleTerrainMostDetailed)
- Community threads report that terrain LOS is not in open-source CesiumJS, while an LOS analysis tool is part of the Cesium ion SDK. — [Cesium community: LOS analysis tool](https://community.cesium.com/t/line-of-sight-analysis-tool/15747); [LOS calculations](https://community.cesium.com/t/line-of-sight-calculations/363)
- **Cesium ion SDK** extends CesiumJS with GPU-accelerated line of sight, viewshed and visibility analysis (sensor geometries: cones, rectangles, domes), measurement tools and ready-made UI widgets. It is commercial. — [Cesium ion SDK](https://cesium.com/platform/cesiumjs/ion-sdk/)
- **Fresnel ellipsoid in Cesium**: a 2025 forum thread asks how to draw an elongated ellipsoid between two points (Cesium ellipsoids are centre-point based), ideally clipped by terrain. No concrete solution had been posted when it was fetched. — [Cesium community thread](https://community.cesium.com/t/fresnel-zone-elongated-ellipsoid-visualisation-of-two-points-path/43024)
- **Blare Tech (Jan 2024 Cesium blog)**: cloud 5G planning tools on CesiumJS with 3D Tiles, Cesium World Terrain and Bing aerial imagery. RSRP is shown as colour gradients over 3D buildings for site-candidate analysis. They claim planning is "90% faster". No LOS or Fresnel is mentioned. — [Cesium blog](https://cesium.com/blog/2024/01/30/blare-tech-builds-5g-network-planning-tools-with-cesiumjs/)
- **MATLAB `siteviewer`** (Antenna Toolbox) is the closest academic analogue to a 3D telecom digital twin. It shows Tx/Rx sites on a 3D globe with GMTED2010 or DTED terrain, OSM buildings and basemaps (Esri/OSM), and works with coverage, link, LOS and ray-tracing functions. It falls back to flat terrain when offline. — [MathWorks siteviewer](https://www.mathworks.com/help/antenna/ref/siteviewer.html)

### Inferences
- Practical Cesium recipe for our project: sample about 200 points along the link with `sampleTerrainMostDetailed`, add earth-bulge (k=4/3) and Fresnel radius per point in FastAPI or the client, then draw: (1) a `Polyline` for LOS coloured by verdict, (2) the Fresnel volume as a custom tube/ellipsoid (e.g. a `PolylineVolume` with radius varying along the path, or a scaled and rotated `EllipsoidGraphics` whose radii are (d/2, r1, r1) oriented with a quaternion along the Tx-Rx vector), (3) a vertical exaggeration toggle. This is inference, not a documented Cesium sample.
- The MATLAB siteviewer visual language (green/red link lines over terrain) is familiar to engineering students and is a good model for "engineering mode".

### Gaps
- No public CesiumJS demo of 3D Fresnel-ellipsoid rendering was found. No Cesium sandcastle for satellite-link visualization was checked in this pass.
- Viewshed in open-source CesiumJS (shadow-map tricks) was mentioned in community threads but not verified.

## 5. Interactive educational simulators (modulation, BER/SNR, propagation) and teaching UX patterns

### Takeaway
There is no PhET simulation for link budgets or digital modulation. Educational wireless simulators are mostly MATLAB/Simulink examples, India's Virtual Labs (theory, procedure, simulation, quiz format) and small GitHub modulation explorers. The proven teaching pattern is immediate cause-and-effect feedback (PhET) plus a constellation diagram and BER for the chosen modulation and SNR.

### Cited Findings
- **PhET** (CU Boulder): free web sims that "make invisible concepts visible with immediate cause-and-effect feedback". It covers radio waves and EM fields but has no wireless link-budget, BER or constellation sim. — [LibreTexts PhET overview](https://phys.libretexts.org/Learning_Objects/Visualizations_and_Simulations/PhET_Simulations)
- **MATLAB "Examine 256-QAM Using Simulink"**: a QAM + AWGN + phase-noise model with constellation diagrams and BER computation. — [MathWorks](https://www.mathworks.com/help/comm/gs/examine_256_qam_using_simulink.html)
- **MATLAB File Exchange "Modulation Formats" app**: AM/FM/PM/ASK/FSK/PSK/QAM with real-time signal visualization, constellation, PSD and SNR evaluation. — [File Exchange](https://in.mathworks.com/matlabcentral/fileexchange/180309-modulation-formats)
- **Interactive Digital Modulation Explorer** (GitHub, marianciuc): explanations plus visual aids, with user inputs (carrier frequency, noise level) and real-time modulated-signal plots. — [GitHub](https://github.com/marianciuc/Interactive-Digital-Modulation-Explorer)
- **Virtual Labs (IIIT Hyderabad) Wireless Communications – OFDM experiment**: a browser simulation where you choose BPSK/QPSK/16-QAM and SNR and view Tx vs Rx constellations. — [vlabs OFDM sim](https://wc-iiith.vlabs.ac.in/exp/ofdm/simulation/index.html); lab home [wc-iiith.vlabs.ac.in](https://wc-iiith.vlabs.ac.in/)
- **uOttawa ELG4179 (Wireless Communication Fundamentals)** assignment: an example of university coursework on these topics. — [uOttawa PDF](https://www.site.uottawa.ca/~sloyka/elg4179/A5_ELG4179.pdf)

### Inferences
- UX patterns to adopt, synthesized from the tools above:
  1. Inputs on the left, live result plus formula with substituted numbers on the right (Pasternack-style formula display, made live).
  2. Colour verdict thresholds as in urwb (>=10 dB margin green, <6 dB red).
  3. A "fix it" button (CloudRF raise-to-60%-F1).
  4. A constellation panel that changes from 256-QAM to QPSK as the fade-margin slider (rain/fog/obstruction scenario) drops SNR, linking adaptive modulation to the link budget.
  5. A PhET-style "presentation mode" with few controls, big visuals and immediate feedback, and an "engineering mode" exposing ITU-R parameters (P.530/P.526/P.838) as Cambium LINKPlanner does.
  6. Shareable URL state (Meshtastic).

### Gaps
- No Jupyter/Streamlit link-budget demo was verified in this pass. MIT/other university wireless-propagation web labs were not found.
- No web tool found animates the Fresnel ellipse over time. Animation would be a differentiator, though "no tool found" is not proof none exists.
