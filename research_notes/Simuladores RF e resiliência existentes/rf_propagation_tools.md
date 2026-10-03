# General-purpose RF propagation and radio planning software (status as of Oct 2026)

Context: positioning an academic web simulator (FastAPI + Next.js + Cesium) of a 3.69 km, 5.8 GHz PtP link in Maputo (FSPL, Fresnel, k=4/3, link budget, fade margin, adaptive modulation, failure scenarios).

Research note: about 22 searches and fetches. Several vendor pages (CloudRF docs, CRC-COVLIB GitHub) did not load or returned 404, so some items are listed under Gaps instead of being guessed.

---

## 1. Free / open-source / hobbyist tools (Radio Mobile, SPLAT!, Signal-Server, HeyWhatsThat, QRadioPredict)

### Takeaway
The free tools all rely on Longley-Rice/ITM (sometimes ITWOM) over SRTM terrain, and they share the same output pattern: a path profile with Fresnel or LOS checks plus coverage rasters or KML. They are desktop or CLI tools from the 2000s–2010s. Most are not maintained or only lightly maintained. None of them offers a modern 3D web UI that combines link budget, availability and failure scenarios.

### Cited Findings
**Radio Mobile (Roger Coudé, VE2DBE)**
- Freeware, "since 1988", copyright Roger Coudé VE2DBE, "dedicated to amateur radio and humanitarian use". Commercial use is not prohibited, but the users must respect the terms of the external data sources. The official site offers a desktop download, "Radio Mobile Online" and a "Radio Mobile for the Moon" version. The site footer says "Last update: December 2, 2023" — [VE2DBE official site](https://www.ve2dbe.com/english1.html)
- It uses digital terrain data and a mathematical model to simulate links between two fixed sites, or between a fixed site and a mobile. Its terrain databases cover ground elevation, land cover and population density, about 200 GB in total. It runs on Windows (XP through 11). An aggregator lists version 11.6.0.6 updated Aug 16, 2026. This is **unverified** and conflicts with the 2023 footer on the official site — [FreeDownloadManager listing](https://en.freedownloadmanager.org/Windows-PC/amp/Radio-Mobile-FREE.html)
- Described as point-to-point planning freeware for hams: link paths, repeater coverage, simplex link budgets — [RF Cafe](https://www.rfcafe.com/miscellany/cool-products/radio-mobile-point-to-point-planning-freeware.htm)
- Widely used in Latin American academic theses and manuals, for example a UTN Ecuador manual — [UTN repository PDF](https://repositorio.utn.edu.ec/bitstream/123456789/1057/4/04%20RED%20O12%20-6%20MANUAL%20RADIOMOBILE.pdf)

**SPLAT! (John Magliacane, KD2BD)**
- Latest version is **1.4.2, released Dec 8, 2014**, so it is effectively unmaintained. It covers 20 MHz–20 GHz, which includes 5.8 GHz. It uses the Longley-Rice ITM and ITWOM v3.0 models with USGS and SRTM terrain. Features: great-circle distance, bearing, elevation angles, LOS determination, Fresnel zone clearance and minimum antenna height, coverage maps with signal contours, and multi-site mutual coverage. Outputs are terrain profiles, 24-bit PPM coverage maps, text reports, KML (Google Earth) and .geo (Xastir). Licence: GNU GPL v2. Linux-native, with community Mac and Windows ports — [SPLAT! official page](https://www.qsl.net/kd2bd/splat.html); [Wikipedia](https://en.wikipedia.org/wiki/SPLAT!)

**Signal-Server (Alex Farrant / CloudRF)**
- Forked from SPLAT! 1.3 in 2011 to power CloudRF. It is built to run unattended on servers with command-line arguments. Models: ITM, Hata, LOS, among others. LiDAR support (1 m resolution) was added in 2016. Licence: GPLv2. CloudRF stopped maintaining it in 2018–2019 after replacing it with its own engine "SLEIPNIR". The original GitHub repo was **deleted in 2023**. Community forks still exist, with updates through 2025 — [GitHub Cloud-RF/Signal-Server (README/mirror)](https://github.com/Cloud-RF/Signal-Server); [mirror](https://git.tjdev.de/mirror/Signal-Server/src/commit/7d766ee39ebb39a7ae72d052f2a01dfbb859778d)

**HeyWhatsThat**
- A web service built on USGS SRTM terrain (3 arc-second) processed with custom C++ code. It computes viewsheds ("visibility cloak"). Its **Path Profiler** analyses point-to-point radio/TV/wifi/microwave links, and antenna heights can be absolute or above ground ("+"). It accounts for terrestrial refraction by adding about 14% to the curvature correction. It uses the WGS84 ellipsoid and Google Maps (Mercator). It offers Profiler, Planisphere and Contours APIs, free for non-commercial low-volume use — [HeyWhatsThat Tech FAQ](https://contour.heywhatsthat.com/techfaq.html)

**QRadioPredict**
- Experimental VHF-UHF prediction tool using ITM (Longley-Rice) and ITWOM v3.0. Terrain comes from NASA SRTM 3 arc-second .hgt files, with OpenStreetMap or satellite imagery as background. It handles up to 4 ground stations plus 1 mobile and can connect to the FlightGear flight simulator. It runs on Linux, with a Windows 32-bit (Vista) port — [SlackBuilds](https://slackbuilds.org/repository/14.2/ham/qradiopredict/); [project page](https://zff.dev/kantooon/qradiopredict); [FlightGear wiki](https://wiki.flightgear.org/QFGRadio)

### Inferences
- An ITM-based tool is a poor fit for checking a 5.8 GHz LOS link. ITM is a statistical area model, while short microwave PtP design is normally done with FSPL + P.526 diffraction + P.530 clear-air and rain fading. Our simulator can position itself as "P.530-oriented", unlike the free hobbyist tools.
- HeyWhatsThat's "add ~14% to the curvature correction" is a different refraction convention from our k=4/3. With k=4/3, the effective radius is 1.333 × R, so the bulge drops by about 25%. We should document the convention clearly.
- Radio Mobile is the closest free analogue for academic use in Lusophone and Hispanic Africa and Latin America, so it is the natural benchmark to compare our outputs against.

### Gaps
- I could not confirm the current Radio Mobile version or whether Radio Mobile Online is still active in 2026. The official site footer (2023) conflicts with the aggregator's 2026 version claim.
- I did not verify which forks of Signal-Server are recommended now.

---

## 2. CloudRF (web + API, 3D)

### Takeaway
CloudRF is the closest commercial analogue to our architecture: a web UI plus a REST API, a point-to-point path tool with a 3D Fresnel ellipsoid in KMZ, 13 propagation models (P.1812 recommended by default, P.525 FSPL, ITM, Hata, COST231, SUI, and others), several diffraction options, and a GPU 3D ray-tracing engine. I found no evidence that it models rain attenuation, P.530 or availability percentages.

### Cited Findings
- The API computes RF coverage, link budgets and interference for any radio, antenna and terrain. Endpoints cover point-to-point paths, point-to-multipoint heatmaps, multi-site meshes and best-server selection — [Jentic CloudRF API summary](https://jentic.com/apis/cloudrf.com/cloudrf.md)
- The KMZ path download contains Tx and Rx placemarks, a **3D Fresnel zone ellipsoid** and an interactive balloon with a path chart and API metadata. Around each link is a 3D ellipsoid for the estimated Fresnel zone, which is "like a laser" at SHF — [CloudRF Web Interface docs](https://cloudrf.com/documentation/04_web_interface_functions.html) (the page did not render through the fetch tool, so this is quoted via the search snippet)
- The 3D engine uses a volumetric design. It supports multipath, phase tracking to model fast fading, up to 10 reflections, material attenuation, reflectivity and diffusivity, and multiple sites — [CloudRF docs (search snippet)](https://cloudrf.com/documentation/04_web_interface_functions.html); [SOOTHSAYER 1.6 flyer](https://cloudrf.com/wp-content/uploads/2023/08/SOOTHSAYER-1.6-flyer-.pdf)
- Model list with frequency ranges: 1 ITM 20–20,000 MHz; 2 LOS; 3 Okumura-Hata 150–1,500 MHz; 4 ITU-R P.1812 30–6,000 MHz; 5 SUI Microwave 1,900–11,000 MHz; 6 COST231-Hata 150–2,000 MHz; 7 ITU-R P.525 FSPL 2–90,000 MHz; 8 RADAR with RCS; 9 Ericsson 9999 150–1,900 MHz; 10 General Purpose; 11 Egli 2–1,500 MHz; 12 HF NVIS; 13 HF Skywave. Their advice is "Use the P.1812 model if you are unsure". Diffraction options: knife-edge, Bullington, Deygout-94 and Epstein-Peterson, which work together with clutter — [CloudRF propagation models](https://cloudrf.com/propagation-models/)
- SOOTHSAYER is CloudRF's on-premise/server product, with an ATAK plugin — [SOOTHSAYER flyer](https://cloudrf.com/wp-content/uploads/2023/08/SOOTHSAYER-1.6-flyer-.pdf); [APKPure ATAK plugin](https://apkpure.com/atak-plugin-soothsayer/com.cloudrf.android.soothsayer.plugin)

### Inferences
- The 3D Fresnel ellipsoid exported to KMZ is a direct UX reference for our Cesium 3D view: we can render the first Fresnel ellipsoid as a Cesium `EllipsoidGraphics` entity oriented along the link.
- For a 5.8 GHz link, the only CloudRF models valid at that frequency are ITM, LOS, P.525 and SUI. P.1812 tops out at 6 GHz, so it barely covers 5.8 GHz.

### Gaps
- I did not obtain 2026 pricing (the cart and pricing pages did not render).
- I could not confirm whether the CloudRF web UI uses Cesium or another 3D globe library.
- I could not confirm any rain or P.530 availability output.

---

## 3. Professional microwave and RAN planning suites (Pathloss, Atoll, ATDI ICS Telecom/HTZ, Infovista Planet, Ranplan, Wireless InSite)

### Takeaway
Pathloss is the reference tool specifically for PtP microwave design (P.530 multipath + rain availability). Atoll, ATDI and Planet are operator-grade, multi-technology suites with microwave modules. Ranplan and Wireless InSite focus on 3D ray tracing (indoor/urban, 5G/6G). They are all commercial and sold by quote. I found no public academic licence terms for any of them.

### Cited Findings
**Pathloss 5/6 (Contract Telecommunication Engineering, CTE, Canada)**
- Pathloss 6 is under continuous development. Pathloss 5 and the AntRad tool are also listed. Pathloss 6 configurations:
  - PL6B Basic: PtP with terrain, antenna heights, diffraction, transmission analysis and reflections/multipath analysis
  - PL6C: adds PTMP and local coverage
  - PL6I: interference, with FCC ULS data
  - PL6T: Total
  - Features: profile generation, specular reflections, multiband links and carrier aggregation
  - Pricing: "can only be purchased through CTE… contact us"
  - Source: [pathloss.com purchase page](https://pathloss.com/purchase.html)
- Academic use: link designs made in Pathloss 5.0 report annual rain + multipath availability values above 99% — [microwave-link.com P.530 notes](https://www.microwave-link.com/tag/rain-fade/); example theses: [KTU](https://epubl.ktu.edu/object/elaba:3085319/3085319.pdf), [Telkom Purwokerto](https://rama.kemdikbud.go.id/document/detail/oai:repository.ittelkom-pwt.ac.id:18-242)

**Forsk Atoll**
- Forsk has made RF planning software since 1987. Atoll was first released in 1997 and has more than 3,500 installed licences. **Atoll Microwave** is a 64-bit backhaul planning and optimisation module for large microwave networks "according to standards" — [Scribd Atoll doc](https://www.scribd.com/document/306243983/Atoll) (secondary source)

**ATDI ICS Telecom / HTZ Communications**
- HTZ Communications is ATDI's flagship RF engineering tool and covers every aspect of propagation modelling. It supports mobile, broadcast, fixed services (P2P, PMP) and microwave — [Scribd HTZ overview](https://www.scribd.com/document/513352636/HTZ-Overview) (secondary source)
- ICS Telecom is a commercial platform for network planning and spectrum management, aimed at operators, regulators, manufacturers and consultants — [search result, Bilkent/other](https://repository.bilkent.edu.tr/items/af8a06a2-3798-4e89-956c-2a77623d93df) (secondary source)

**Infovista Planet**
- It supports 3D planning natively, with high-resolution 3D building and vegetation vectors, 3D ray-launching propagation models, 3D traffic maps, 3D beamforming and 3D site selection. Its models include CRC-Predict, the Planet 3D Model (P3M) and the Universal Model. It also has an ML-based model, "Planet AI model" — [Infovista Planet RF planning](https://prod.infovista.com/products/planet/rf-planning-software); [Planet AI model](https://prod.infovista.com/resources/planning/planet-ai-model-worldfirst-machine-learning-for-wireless-planning)

**Ranplan Professional (Ranplan Wireless)**
- Software for designing, optimising and simulating in-building and urban outdoor networks with 3D ray tracing. The vendor claims a 50% productivity gain and 30% CAPEX/OPEX reduction (marketing claims) — [Critical Communications World](https://critical-communications-world.com/exhibitor-products/ranplan-professional); [RCR Wireless](https://www.rcrwireless.com/20190524/uncategorized/ramplan)

**Remcom Wireless InSite**
- A suite of ray-tracing models and 2D field solvers for site-specific propagation. Its **X3D** model is a full 3D GPU and multi-threaded ray model with reflections, transmissions, diffractions and frequency-dependent atmospheric absorption, with no restriction on geometry or Tx/Rx height. Target uses: 5G, 6G, WiFi, and indoor, urban and rural multipath — [Remcom Wireless InSite](https://www.remcom.com/wirelessinsite); [X3D high-fidelity ray tracing](https://remcom.com/wireless-insite-models/high-fidelity-ray-tracing)

### Inferences
- How availability is presented: Pathloss-style tools report annual or worst-month **availability % and outage seconds**, split into multipath (clear-air) and rain contributions, following P.530 — [microwave-link.com](https://www.microwave-link.com/tag/rain-fade/). Our simulator could copy that split (e.g. "multipath unavailability X s/yr + rain Y s/yr → 99.99x%").
- Ray-tracing suites (Wireless InSite, Ranplan, Planet) are overkill for a 3.69 km LOS link. Their value to us is the UX idea of 3D buildings, not the physics.

### Gaps
- I found no public prices or academic licence programmes for Atoll, ATDI, Planet, Ranplan or Wireless InSite. Most likely they are quote-based, but I did not verify this.
- I did not fetch Forsk's or ATDI's own pages, so the details on those tools come from secondary documents (Scribd).

---

## 4. MATLAB (Antenna / Communications Toolbox RF propagation) and Sionna RT

### Takeaway
MATLAB has the most complete scriptable "site viewer" workflow: a 3D globe, OSM buildings, and models from freespace and rain to Longley-Rice, TIREM and ray tracing. It is effectively our feature set, but desktop-based and licensed. Sionna RT (NVIDIA, Apache-2.0) is the open-source state of the art for GPU differentiable ray tracing, and it is aimed at research rather than link planning.

### Cited Findings
- `propagationModel` supports: "freespace", "rain", "gas", "fog", "close-in", "longley-rice", "tirem" and "raytracing". Site Viewer is a 3D interactive globe (or indoor scene) that shows Tx/Rx sites, coverage, signal strength and SINR. It can import terrain (DTED), buildings (OpenStreetMap) and STL geometry for indoor scenes. It computes distances, angles and link margins — [MathWorks RF Propagation and Visualization](https://www.mathworks.com/help/comm/ug/rf-propagation-and-visualization.html)
- The ray-tracing model is a `RayTracing` object created with `propagationModel`, using shooting-and-bouncing rays (SBR) by default. You can configure max reflections and diffractions, a path-loss threshold, and building and terrain materials. By default `raytrace` finds paths with up to 2 reflections and 0 diffractions and discards paths more than 40 dB below the strongest — [MathWorks raytrace](https://www.mathworks.com/help/comm/ref/txsite.raytrace.html)
- `los(tx, rx)` plots the line of sight in Site Viewer, colour-coded as clear or obstructed — [MathWorks txsite.los](https://www.mathworks.com/help/comm/ref/txsite.los.html); there is also a seawater aircraft-link example — [MathWorks example](https://nl.mathworks.com/help/comm/ug/analyze-communication-links-for-aircraft-over-seawater-using-ray-tracing.html)
- Sionna RT: a ray-tracing extension built on Mitsuba 3 and TensorFlow (later versions were re-architected). It is differentiable, runs in Jupyter, is Apache 2.0 licensed and GPU-accelerated — [Sionna RT paper arXiv 2303.11103](https://arxiv.org/pdf/2303.11103). Releases:
  - v1.0, Apr 2025: complete re-architecture
  - v1.1, Jun 2025: mesh-based measurement surfaces
  - v1.2.0, Sep 2025: diffraction in path computation and radio maps
  - Sources: [Sionna RT technical report arXiv 2504.21719](https://arxiv.org/pdf/2504.21719); [GitHub releases](https://github.com/NVlabs/sionna-rt/releases)
- SceneBaker (2026 arXiv) generates Sionna-ready Mitsuba scenes from OpenStreetMap plus terrain — [arXiv 2608.04546](https://arxiv.org/pdf/2608.04546)

### Inferences
- MATLAB's "rain" model plus Site Viewer is the closest academic precedent for our "rain fade" scenario. Citing it would justify the simulator as an open, web-based alternative to a MATLAB licence.
- Sionna RT could be an optional backend for urban Maputo multipath in future work. It is not needed for the core LOS link.

### Gaps
- I did not verify which MATLAB toolbox licence is required (Antenna Toolbox versus Communications Toolbox), nor MATLAB academic pricing.
- I did not confirm whether MATLAB's rain model follows ITU-R P.838/P.530. It most likely follows P.838, but this is unverified.

---

## 5. Open-source Python libraries (itur / ITU-Rpy, pycraf, CRC-COVLIB)

### Takeaway
ITU-Rpy (`itur`) already implements P.530, P.838, P.837 and others, which makes it a ready-made backend for our FastAPI rain-attenuation and availability calculations. pycraf implements P.452 with SRTM profile extraction. I could not verify CRC-COVLIB.

### Cited Findings
- ITU-Rpy implements P.453, **P.530**, P.618, P.676, P.835, P.836, P.837, **P.838**, P.839, P.840, P.1144, P.1510, P.1511, P.1623 and P.1853. It depends on numpy, scipy, pyproj and astropy (cartopy and matplotlib are optional). P.526 is not listed — [ITU-Rpy docs](https://itu-rpy.readthedocs.io/en/latest/); [PyPI itur](https://pypi.org/project/itur/)
- ITU-Rpy does fast vectorised atmospheric attenuation on slant and horizontal paths, and lists P.838-3, P.618-13 and P.837-7 — [PyPI itur](https://pypi.org/project/itur/); [itu618 source](https://itu-rpy.readthedocs.io/en/latest/_modules/itur/models/itu618.html)
- pycraf is a spectrum-management and compatibility-studies package from the radio astronomy community. It implements ITU-R **P.452-17**: LOS with multipath and focusing corrections, terrain diffraction, troposcatter, and ducting or layer reflection. It gives easy SRTM queries, and `pathprof` returns height profiles, distances and back-bearings between two points — [pycraf paper arXiv 1805.11434](https://arxiv.org/pdf/1805.11434); [notebook](https://nbviewer.org/github/bwinkel/pycraf/blob/v0.25.7/notebooks/03a_path_propagation_basic.ipynb); [PyPI](https://pypi.org/project/pycraf/0.24.5/)
- P.530 rain method (summary): take the rain rate exceeded 0.01% of the time, compute the specific attenuation (P.838), compute the effective path length, then compute A0.01 and scale it to other percentages — [microwave-link.com P.530](https://www.microwave-link.com/tag/rain-fade/)
- An academic comparison of PtP prediction models and implementations (P.530 and others) — [Bilkent thesis](https://repository.bilkent.edu.tr/items/af8a06a2-3798-4e89-956c-2a77623d93df); an optimised planning tool for microwave terrestrial and satellite links (ISCTE, Q1 journal) — [ISCTE paper](https://repositorio.iscte-iul.pt/bitstream/10071/28627/1/article_95860.pdf)

### Inferences
- For Maputo, we can call `itur` for R0.01 (P.837), γR (P.838) and the P.530 rain attenuation, which avoids hand-coding the coefficient tables. We still need our own P.526 knife-edge implementation, or pycraf's P.452 diffraction.
- The ISCTE paper is a natural related-work citation for an ISCTEM project, because it is an academic tool for microwave link design.

### Gaps
- **CRC-COVLIB**: the expected GitHub URL (github.com/CRC-Canada/CRC-COVLIB) returned 404 and searches found nothing. I could not confirm which models it includes, its licence or its status. Note that Infovista Planet does include "CRC-Predict" (see section 3).
- I did not confirm the latest itur version or the exact P.530 revision it implements.

---

## 6. Cross-cutting: Fresnel / path profile, 3D buildings, free/academic, availability and rain presentation

### Takeaway
Path profile plus Fresnel is the standard view in Radio Mobile, SPLAT!, HeyWhatsThat (profile only), CloudRF (3D Fresnel ellipsoid in KMZ) and Pathloss. 3D buildings are found in CloudRF 3D, MATLAB Site Viewer (OSM), Planet, Ranplan, Wireless InSite and Sionna. Availability (99.99%) and P.838/P.530 rain are a strength of Pathloss-class microwave tools, and they are absent from all the free web tools I reviewed. That absence is our differentiation niche.

### Cited Findings
- Path profile + Fresnel: SPLAT! (Fresnel clearance and minimum antenna height) — [SPLAT!](https://www.qsl.net/kd2bd/splat.html); HeyWhatsThat Path Profiler — [Tech FAQ](https://contour.heywhatsthat.com/techfaq.html); CloudRF 3D Fresnel ellipsoid — [CloudRF docs](https://cloudrf.com/documentation/04_web_interface_functions.html); Pathloss terrain, diffraction and reflection modules — [pathloss.com](https://pathloss.com/purchase.html); Global Mapper path profile with a 60% first-Fresnel-zone clearance default and an atmospheric curvature correction — [Blue Marble Global Mapper](https://www.bluemarblegeo.com/knowledgebase/global-mapper/Path_Profile/PathProfile_LOS.htm)
- 3D buildings: MATLAB (OSM buildings) — [MathWorks](https://www.mathworks.com/help/comm/ug/rf-propagation-and-visualization.html); Planet (3D building and vegetation vectors) — [Infovista](https://prod.infovista.com/products/planet/rf-planning-software); Wireless InSite X3D — [Remcom](https://remcom.com/wireless-insite-models/high-fidelity-ray-tracing); Sionna RT with OSM via SceneBaker — [arXiv](https://arxiv.org/pdf/2608.04546); CloudRF 3D engine — [CloudRF](https://cloudrf.com/documentation/04_web_interface_functions.html)
- Free or open: Radio Mobile (freeware), SPLAT! and Signal-Server (GPLv2), QRadioPredict, HeyWhatsThat (free for non-commercial use), itur, pycraf, Sionna RT (Apache 2.0) — sources as cited above
- Availability/rain presentation: P.530 combines clear-air multipath fading and rain fading to give an annual availability %. Pathloss 5 designs report rain + multipath availability — [microwave-link.com](https://www.microwave-link.com/tag/rain-fade/)

### Inferences
- **Positioning:** I found no free, web-based, 3D (Cesium) tool that combines a path profile with Fresnel and k-factor, a full link budget, P.530/P.838 rain availability, adaptive modulation and failure-scenario injection. The pieces exist separately: HeyWhatsThat and CloudRF have the web profile, Pathloss has availability, and MATLAB has the 3D globe and rain model. Our simulator can integrate them for teaching.
- Suggested benchmarks for validation: Radio Mobile (free) for the profile and received level, and itur for rain attenuation.

### Gaps
- I found no published head-to-head comparison of these tools at 5.8 GHz. I also found no tool that explicitly models equipment or failure scenarios, such as power or antenna misalignment, alongside propagation.
