# Solar/Battery Energy Sizing & Simulation Tools for Off-Grid / Backup-Powered Telecom Sites

Context: hospital node (~100 W contingency load, ~12 kWh battery, 0.8–1.0 kWp PV) and shelter node (~30 W, ~3.6 kWh, 0.3–0.4 kWp) of a 5.8 GHz PtP link in Maputo (lat -25.97, lon 32.57); target 72 h autonomy without EDM grid. Research date: 2026-10-03.

## 1. PVGIS (EU JRC) — off-grid calculator and Maputo yield (most directly reusable)

### Takeaway
PVGIS is free, covers Africa with SARAH3 satellite data, and has an off-grid ("SHScalc") calculator whose outputs (days with full/empty battery, energy not captured, energy missing, SoC histograms) map almost one-to-one onto what our energy module needs; it also exposes a public REST API we queried directly for Maputo.

### Cited Findings
- Off-grid inputs: battery capacity in Wh (voltage × Ah), discharge cutoff limit (default 40 % for lead-acid; lithium-ion can use ~20 %), daily consumption in Wh, and an optional hourly consumption profile file whose 24 values are fractions of daily consumption summing to 1 (otherwise a default household profile is used) — [PVGIS user manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en)
- Off-grid outputs: monthly graphs of daily energy output and energy wasted when battery is full, frequency of battery full/empty events, battery charge-state histograms; metrics: % days battery full, % days battery empty, average energy not captured, average energy missing — [PVGIS user manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en)
- Algorithm: hourly simulation over the multi-year time series; uses a whole-off-grid-system performance ratio of 0.67 for battery/inverter/other losses — [PVGIS user manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en)
- PVGIS-SARAH3 covers Africa and is the default database there — [PVGIS user manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en)
- **Maputo grid-connected yield (PVcalc API, 1 kWp c-Si, 14 % loss, optimal angles)**: database PVGIS-SARAH3, elevation 4 m, optimal slope 29°, azimuth ≈ north (-179°); E_y = 1,590 kWh/kWp/yr; H(i)_y = 2,062 kWh/m²/yr in-plane; monthly E_d (kWh/kWp/day): Jan 4.37, Feb 4.69, Mar 4.61, Apr 4.27, May 4.43, Jun 4.32, Jul 4.39, Aug 4.47, Sep 4.46, Oct 4.10, Nov 4.05, Dec 4.14; monthly in-plane H(i)_d (kWh/m²/day) range 5.33 (Oct/Nov) to 6.23 (Feb), Jun 5.44, Jul 5.53; total system loss 22.89 % — [PVGIS API PVcalc query](https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=-25.97&lon=32.57&peakpower=1&loss=14&optimalangles=1&outputformat=json)
- **Hospital scenario, off-grid API, default angles** (900 Wp, 12,000 Wh, 40 % cutoff, 2,400 Wh/day = 100 W×24 h): SARAH3 + ERA5, 2005–2023 (6,939 days); days battery full 54.11 %, days battery empty 3.67 %; avg energy not captured 1,394 Wh/d; avg energy missing 390 Wh/d; empty-battery days concentrated in June (13.16 %) and July (22.92 %) — [PVGIS API SHScalc query (default angle)](https://re.jrc.ec.europa.eu/api/v5_3/SHScalc?lat=-25.97&lon=32.57&peakpower=900&batterysize=12000&cutoff=40&consumptionday=2400&outputformat=json)
- **Hospital scenario, tilted 29° north-facing, 20 % cutoff (Li-ion)**: days battery full 74.28 %, days empty 0.09 %; June/July empty 0.0 %; avg energy not captured 1,422 Wh/d; reported avg energy missing 341 Wh/d — [PVGIS API SHScalc query (29°, aspect 180)](https://re.jrc.ec.europa.eu/api/v5_3/SHScalc?lat=-25.97&lon=32.57&peakpower=900&batterysize=12000&cutoff=20&consumptionday=2400&angle=29&aspect=180&outputformat=json)
- **Shelter scenario, tilted 29° north, 20 % cutoff** (350 Wp, 3,600 Wh, 720 Wh/day = 30 W×24 h): days full 85.72 %, days empty 0 %, avg energy missing 0 Wh/d, avg not captured 728 Wh/d; June full-battery days 92.63 %, July 92.02 % — [PVGIS API SHScalc query (shelter)](https://re.jrc.ec.europa.eu/api/v5_3/SHScalc?lat=-25.97&lon=32.57&peakpower=350&batterysize=3600&cutoff=20&consumptionday=720&angle=29&aspect=180&outputformat=json)
- PVGIS aspect convention: 0 = south, 180 = north (so aspect=180 is the correct equator-facing orientation for Maputo); the API's summarizer mislabelled it as "south-facing" — note for anyone re-running. (Convention is consistent with the PVcalc optimum returning azimuth -179° for Maputo — [PVcalc query](https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=-25.97&lon=32.57&peakpower=1&loss=14&optimalangles=1&outputformat=json))

### Inferences
- The two hospital runs change both tilt and cutoff, so the improvement (3.67 % → 0.09 % empty days) is not attributable to tilt alone; but the winter (Jun/Jul) failures in the default-angle run strongly suggest the default is a low/horizontal tilt — our simulator should expose tilt and use ~26–29° north-facing for Maputo.
- "Average energy missing" (341 Wh/d) coexisting with only 0.09 % empty days suggests the metric is averaged over deficit days only, not all days; treat it as a conditional value (unverified — check manual wording before quoting).
- Our design (hospital 0.9 kWp/12 kWh; shelter 0.35 kWp/3.6 kWh) is validated by PVGIS as essentially autonomous on solar alone in Maputo when tilted properly; the shelter is comfortably oversized (~86 % days ending full).
- UX inspiration: copy PVGIS's monthly bar chart (energy delivered vs wasted), monthly % full/% empty, and SoC histogram; the API can be called live from the simulator (free, no key).

### Gaps
- Exact default tilt for SHScalc when `angle` is omitted was not confirmed from documentation.
- PVGIS does not output an explicit "hours of autonomy during an outage" time series; it simulates continuous off-grid operation.

## 2. Global Solar Atlas (World Bank / Solargis) — Maputo sanity check

### Takeaway
Global Solar Atlas gives GHI ≈ 1,800 kWh/m²/yr (≈4.9 kWh/m²/day) and PVOUT ≈ 1,573 kWh/kWp/yr for Maputo, consistent with PVGIS (1,590 kWh/kWp/yr).

### Cited Findings
- Maputo (-25.97, 32.57) long-term averages: GHI 1,800.13 kWh/m²/yr; DNI 1,676.19; DIF 712.37; GTI at optimum tilt 1,969.24 kWh/m²/yr; optimum tilt 26°; PVOUT 1,573.40 kWh/kWp/yr; mean air temp 22.81 °C; elevation 8 m — [Global Solar Atlas API](https://api.globalsolaratlas.info/data/lta?loc=-25.97,32.57)
- Monthly GHI (kWh/m²/month), Jan→Dec: 190.77, 166.73, 164.95, 131.61, 122.39, 107.94, 115.78, 134.66, 148.77, 159.90, 169.62, 186.99 (June minimum ≈ 3.6 kWh/m²/day horizontal; January ≈ 6.2) — [Global Solar Atlas API](https://api.globalsolaratlas.info/data/lta?loc=-25.97,32.57)
- Monthly PVOUT (kWh/kWp/month): 136.62, 127.66, 140.28, 126.03, 132.87, 125.52, 130.39, 135.99, 132.30, 128.25, 125.19, 132.31 (June ≈ 4.18 kWh/kWp/day) — [Global Solar Atlas API](https://api.globalsolaratlas.info/data/lta?loc=-25.97,32.57)
- Monthly GTI at optimum tilt: June 152.28 kWh/m² (≈5.1 kWh/m²/day), lowest month — [Global Solar Atlas API](https://api.globalsolaratlas.info/data/lta?loc=-25.97,32.57)
- GSA data layers: PVOUT (kWh/kWp) and GHI (kWh/m²); solar resource resolution 9 arcsec (~250 m), PVOUT/TEMP 30 arcsec (~1 km); GIS downloads per country — [World Bank Data Catalog](https://datacatalog.worldbank.org/search/dataset/0038645)

### Inferences
- Design check (hospital): worst-month yield ≈ 4.1–4.3 kWh/kWp/day (GSA/PVGIS) × 0.9 kWp ≈ 3.7–3.9 kWh/day before battery losses vs 2.4 kWh/day load; even with PVGIS's off-grid PR 0.67 applied to in-plane irradiance (~5.1 kWh/m²/day × 0.9 × 0.67 ≈ 3.1 kWh/day) the array covers the load in June. Shelter: 0.35 × 5.1 × 0.67 ≈ 1.2 kWh/day vs 0.72 kWh/day.
- Horizontal mounting would drop June irradiance to ~3.6 kWh/m²/day — this is the main risk the simulator should visualise.

### Gaps
- Inter-annual variability / worst consecutive cloudy days for Maputo were not found (PVGIS hourly series could be downloaded to compute this).

## 3. HOMER Pro / HOMER Grid (UL Solutions)

### Takeaway
HOMER is the de facto commercial hybrid micro-grid optimiser; it reports "battery autonomy" in hours (usable capacity ÷ average load) and enforces reliability via capacity-shortage constraints; HOMER Grid adds outage-specific constraints and battery reserve settings.

### Cited Findings
- Autonomy definition: "HOMER calculates the autonomy by dividing the usable nominal capacity of the battery bank (kWh) by the average primary load (kW)"; shown on the Battery tab of Simulation Results — [HOMER Knowledge Base: Battery autonomy](https://homerenergy.com/docs/knowledgebase/article/battery-autonomy/)
- Autonomy is based on battery capacity, not instantaneous stored energy; a minimum SoC setting is the workaround to keep reserve; to enforce minimum autonomy, users size externally and constrain the search space — [HOMER Knowledge Base](https://homerenergy.com/docs/knowledgebase/article/battery-autonomy/)
- "Usable nominal capacity" = capacity excluding everything below minimum SoC — [HOMER Pro manual: Battery bank autonomy](https://support.ul-renewables.com/homer-manual-pro/battery_bank_autonomy.html); storage outputs page — [HOMER Pro manual: Storage outputs](https://support.ul-renewables.com/homer-manual-pro/storage_outputs.html)
- HOMER Grid outage settings: constraints on maximum annual capacity shortage (% of load) and maximum hours with shortage per year; penalties per kWh or per hour of shortage; operating reserve as % of load/peak/solar/wind; option for generators to run only during outages; battery reserve fraction kept for outages while the rest does peak shaving — [HOMER Grid manual: Outage settings](https://support.ul-renewables.com/homer-manual-grid/outage_settings.html)

### Inferences
- HOMER's "capacity shortage fraction" is the analogue of loss-of-load probability; its "autonomy (h)" metric is exactly what our simulator should display (hospital: 12 kWh × 0.8 usable / 0.1 kW ≈ 96 h; shelter: 3.6 × 0.8 / 0.03 ≈ 96 h).
- HOMER Grid's "battery reserve for outages" concept is directly relevant for a grid-tied hospital where EDM normally charges the battery.

### Gaps
- Current HOMER Pro/Grid licence prices (2026) were not retrieved from official sources.
- Details of HOMER's time-series SoC plots (DMap/time-series) not confirmed from official docs in this session.

## 4. NREL SAM (System Advisor Model), PVWatts, REopt

### Takeaway
SAM is free and open-source, couples a detailed PV model with an electrochemical battery model, and has grid-outage dispatch with resiliency metrics; PVWatts is its simplified PV engine.

### Cited Findings
- SAM PV+Battery combines detailed PV performance with a nonlinear generic electrochemical battery model; configurations include PVWatts-Battery, Generic System-Battery, Stand-alone Battery; front-of-meter and behind-the-meter — [NREL research hub: Recent Improvements in PV+Battery Modeling in SAM](https://research-hub.nrel.gov/en/publications/recent-improvements-in-pvbattery-modeling-in-nrelaposs-system-adv/)
- Recent SAM releases added dispatch algorithms for grid-outage simulation and resiliency metrics plus LCOS; behind-the-meter dispatch options include manual, REopt optimal, grid power target, price signal, and grid outage dispatch — [SAM webinar 2023 BTM battery dispatch (PDF)](https://SAM.NREL.GOV/images/webinar_files/sam-webinars-2023-btm-battery-dispatch.pdf); [SAM 2020 battery webinar (PDF)](https://SAM.NREL.GOV/images/webinar_files/sam-webinars-2020-battery-technology.pdf)
- NREL guidance doc on battery storage for resilience (outage survival framing) — [NREL Battery Storage for Resilience (PDF)](https://www.ccreee.org/wp-content/uploads/2021/06/Battery-Storage-for-Resilience-NREL.pdf)

### Inferences
- SAM's outage-dispatch approach (simulate an outage starting at each hour of the year and record how long the critical load survives) is the right pattern for our "72 h without EDM" question — preferable to continuous off-grid stats.

### Gaps
- sam.nrel.gov was unreachable (DNS failure) during this session and the NREL resilience PDF did not extract as text, so exact SAM resilience metric names (e.g., average/minimum hours of autonomy, outage survival curve) could not be quoted from primary source.

## 5. PVsyst

### Takeaway
PVsyst (commercial, Swiss) has a "stand-alone system" mode that sizes PV + battery from a required autonomy (days) and a target Probability of Loss of Load (PLOL), then runs an hourly yearly simulation.

### Cited Findings
- PVsyst PLOL = % of time the PV installation cannot meet the load; 1 % PLOL ≈ 3.65 days/year of shortage; literature uses 2–10 % PLOL; autonomy days = days the battery supplies load without PV; validation via hourly yearly simulation with indices "number of autonomous days" and LOLP — [PMC: Novel and cost-efficient design of stand-alone PV system with simulation using PVsyst (2025)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12690110/)
- Price: ~CHF 700/year professional licence, volume discounts 5–20 % — [quickestimate.co blog (secondary, not official)](https://quickestimate.co/blog/pvsyst-price)

### Inferences
- PVsyst's two-parameter sizing (autonomy days + PLOL) is a good UX model: user enters 3 days autonomy and accepted LOLP, tool proposes battery and array.

### Gaps
- Official PVsyst pricing page not fetched; price is from a secondary blog.

## 6. RETScreen Expert (Natural Resources Canada)

### Takeaway
Pre-feasibility tool with free Viewer mode and paid Professional mode; includes off-grid benchmark/visualisation tools, but less suited to hourly SoC analysis.

### Cited Findings
- Viewer mode is free with significant functionality; Professional mode (save/print/premium features) by 12-month subscription, CAD 869 per computer; latest version includes benchmark data and visualisation for off-grid power systems — [Wikipedia: RETScreen](https://en.wikipedia.org/wiki/RETScreen)

### Gaps
- No official NRCan page fetched; off-grid battery modelling details unverified.

## 7. pvlib-python and open-source battery libraries

### Takeaway
pvlib-python models PV output (irradiance, transposition, temperature) but not batteries; battery SoC must be added via a custom dispatch loop or libraries such as bslib.

### Cited Findings
- bslib (battery storage library) simulates AC- and DC-coupled battery storage power and SoC as time series — [PyPI: bslib](https://pypi.org/project/bslib)
- optibess-algorithm can use pvlib to compute hourly annual PV output for PV+storage optimisation — [optibess docs](https://optibess-algorithm.readthedocs.io/en/latest/usage.html)

### Inferences
- For our simulator, a simple hourly energy balance (PVGIS/pvlib hourly PV → SoC update with charge/discharge efficiency, clamp at min SoC) is sufficient and transparent for an academic tool.

### Gaps
- No official pvlib battery example located in this session.

## 8. Vendor calculators (Victron, Ubiquiti)

### Cited Findings
- Victron MPPT calculator matches PV modules to Victron MPPT controllers, checks electrical compatibility and forecasts yield; 164,000+ module database, 13 languages, shareable links, PDF export — [Victron Professional news](https://professional.victronenergy.com/news/detail/268/)

### Gaps
- No information found on a Ubiquiti SunMax sizing tool (SunMax appears discontinued/undocumented in search results).

## 9. Telecom-specific: GSMA Green Power for Mobile, ITU-T, ETSI

### Takeaway
GSMA GPM produced market/vendor analyses for off-grid tower power in Africa rather than a public sizing calculator; ITU-T L.1210 (12/2025) covers power-feeding incl. backup for 5G/access sites, and L.392 covers disaster resilience via movable ICT resource units.

### Cited Findings
- GSMA GPM: "Tower Power Africa" analysis of energy demand and challenges for off-grid/bad-grid towers — [GSMA Tower Power Africa](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/uncategorized/tower-power-africa-energy-challenges-and-opportunities/); vendor landscape — [GSMA GPM Vendor Landscape West Africa (PDF)](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development//wp-content/uploads/2013/06/GPM_Vendor_Landscape_WestAfrica.pdf)
- 2026 trend: African operators moving towers to solar + battery with limited diesel as diesel prices surge; MTN South Sudan cut fuel spend ~30 %, Airtel Africa halved diesel use at Zambia/Congo sites — [Africanews, May 2026](https://www.africanews.com/amp/2026/05/04/africas-telecom-towers-turn-to-solar-as-diesel-costs-surge/)
- ITU-T L.1210 (12/2025) "Sustainable power-feeding solutions for IMT-2020 networks": defines power-feeding structures, components, backup, safety and environmental requirements for mobile and fixed access equipment — [ITU-T L.1210 summary](https://www.itu.int/dms_pubrec/itu-t/rec/l/T-REC-L.1210-202512-I!!SUM-HTM-E.htm)
- ITU-T L.392 (04/2016) "Disaster management for improving network resilience and recovery with movable and deployable ICT resource units" — [ITU-T L.392](https://www.itu.int/rec/T-REC-L.392-201604-I)
- Academic: HOMER-style optimisation of solar for mobile base stations — [Alsharif, Optimization Analysis of Sustainable Solar Power System for Mobile Communication Systems](https://acikerisim.gelisim.edu.tr/xmlui/handle/11363/5745); Tanzania hybrid tower case: CO2 from 33,003 to 2,262 kg/yr — [Tanzania Journal of Engineering and Technology](https://commons.udsm.ac.tz/tjet/vol45/iss1/10)

### Gaps
- No GSMA public sizing calculator found.
- ITU-T L.1700-series content (and any specific autonomy-hour requirement) was not retrieved; L.1210 full text (backup-time values) not read.
- ETSI power-interface standards (e.g., EN 300 132 series) not researched in this session.

## 10. Battery sizing formula and SoC presentation

### Takeaway
Tools converge on: usable energy = autonomy × load; nominal capacity = usable / (DoD × efficiency); then verify with an hourly SoC simulation and report autonomy hours, % empty days / capacity shortage / LOLP.

### Cited Findings
- HOMER: autonomy (h) = usable nominal capacity (kWh) / average load (kW), usable capacity excludes energy below min SoC — [HOMER KB](https://homerenergy.com/docs/knowledgebase/article/battery-autonomy/)
- PVGIS: cutoff 40 % lead-acid / ~20 % Li-ion; off-grid PR 0.67 — [PVGIS manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en)
- PVsyst: autonomy days + PLOL as design targets — [PMC article](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12690110/)

### Inferences
- Applying C = P × t / (DoD × η): hospital 0.1 kW × 72 h / (0.8 × 0.9) = 10 kWh → 12 kWh gives margin (~96 h usable at 80 % DoD, no PV); shelter 0.03 × 72 / 0.72 = 3.0 kWh → 3.6 kWh OK. (η = 0.9 and DoD = 0.8 are assumed typical Li-ion values, not from a cited source.)
- Recommended visualisation for our module: (a) SoC vs time line over a 72 h outage, with min-SoC threshold line and PV/load stacked areas (HOMER/SAM style); (b) monthly % days full/empty bars and SoC histogram (PVGIS style); (c) single KPI "autonomy hours" (HOMER).

### Gaps
- No primary source quoted for a standard round-trip efficiency value.
