# Vendor PtP Wireless Link Planning Tools (status as of Oct 2026)

Scope: vendor and third-party PtP link planners, to inspire and position an academic web simulator (FastAPI + Next.js + Cesium) of a 3.69 km, 5.8 GHz Ubiquiti AF-5XHD link in Maputo. Research budget was limited (~20 tool calls); several vendor pages returned 403/404/timeouts, noted in Gaps.

## Ubiquiti: UISP Design Center / airLink

### Takeaway
UISP Design Center is Ubiquiti's current free, web-based planner (LiDAR overlay, 5 GHz noise-floor simulation, coverage drawing, automatic device suggestions, BOM, export into UISP). The older airLink online calculator is no longer Ubiquiti's main tool, but I found no official notice that it was retired. Public descriptions focus on business and network design more than on detailed engineering outputs like ITU-R availability.

### Cited Findings
- UISP Design Center is "freely available to anyone planning high-speed outdoor wireless networks". Its listed features are LiDAR datasets as a map overlay "to better estimate line-of-sight (LOS)", 5 GHz noise-floor simulation "to better estimate capacity & performance", and Signal/RF Coverage drawing with recommendations for where to place base-station APs and PtP links. — [UISP Help Center (via search snippet; page returned 403 on fetch)](https://help.uisp.com/hc/en-us/articles/22590760757783-ISP-Wireless-Plan-Build-Scale-Your-Business-With-UISP-Design-Center)
- The same help article explains that Fresnel zones are "oblong, elliptical" and should stay clear, with the rule of thumb that 60% of the first Fresnel zone must be unobstructed. — [UISP Help Center (search snippet)](https://help.uisp.com/hc/en-us/articles/22590760757783-ISP-Wireless-Plan-Build-Scale-Your-Business-With-UISP-Design-Center)
- It is web-based, needs a free Ubiquiti account (uisp.ui.com/design-center), runs on real-world maps, simulates performance, recommends hardware automatically, generates a BOM, and covers airMAX AC, airFiber 60 and UFiber GPON. Designs import into the UISP management platform. — [Miro (Ubiquiti distributor, ZA) blog](https://miro.co.za/blog/latest-news/plan-smarter-networks-with-ubiquitis-uisp-design-center)
- Capterra describes it as network planning plus profitability modelling: it simulates wireless links over different distances and environments, designs topologies and calculates business profitability. — [Capterra UISP listing](https://www.capterra.com/p/234674/UNMS/)
- airLink was Ubiquiti's online outdoor wireless link calculator. Sources do not confirm when or whether it was discontinued. — [Capterra UISP listing](https://www.capterra.com/p/234674/UNMS/)
- Ubiquiti also promotes "accurate link simulation with LiDAR" and a built-in link simulator that "automatically optimizes the link using suggested devices". — [UISP overview](https://uisp.com/uisp-overview); [UISP 60 GHz page](https://uisp.com/60ghz-wireless)
- Video walkthrough: "Mastering Ubiquiti: Discover the UISP Design Center". — [YouTube](https://www.youtube.com/watch?v=xzwvrDFlUHQ)

### Inferences
- Ubiquiti's planner is aimed at WISP business design (coverage, BOM, profitability, hand-off to UISP). It does not appear to expose ITU-R P.530 availability or rain calculations, which leaves room for an academic tool that shows the maths openly: FSPL, Fresnel, k=4/3, fade margin, and the modulation step-down.
- Our simulator uses the AF-5XHD as its reference, so the obvious comparison is against UISP Design Center and its device library.

### Gaps
- No primary source confirmed whether UISP Design Center has a 3D view, an elevation-profile chart with a drawn Fresnel ellipse, a per-MCS throughput table, PDF export, or rain modelling. The help page returned 403.
- airLink's discontinuation date and status: not found.
- The airOS built-in "link calculator" or alignment tool was not researched in depth.

## Cambium Networks: LINKPlanner and cnHeat

### Takeaway
LINKPlanner is the most fully documented free vendor planner. It offers a path profile with a 0.6F1 Fresnel zone and a worst-case k-factor earth curve, ITU-R P.530-12/-17/-19 availability (plus Vigants-Barnett), P.837 rain for licensed and mmWave products, "lowest mode availability" for adaptive modulation, BOM, proposal and installation reports, and Google Earth/KML export. cnHeat is a paid LiDAR heat-map service. Major caveat for 2026: Cambium Networks Ltd entered UK administration in September 2026, so the tools' future is uncertain.

### Cited Findings
- LINKPlanner is a free RF link-planning tool for Windows, Mac and Linux, also reachable at lp.cambiumnetworks.com. It models "what if" scenarios (geography, distance, antenna height, transmit power). Path profiles are imported automatically through the "Path Profile Web Service". It generates BOMs plus proposal and installation reports, and now includes a BOM Configurator. — [Cambium LINKPlanner product page](https://cambiumnetworks.com/products/software/linkplanner)
- Profile view: the red line is the line of sight to the largest obstruction ("slope"), blue is 0.6F1, and grey is the worst-case earth curvature (Ke) that occurs up to 0.1% of the time. Terrain is brown, clutter is coloured blocks, obstructions (trees, buildings) are yellow, and azimuth/tilt appear above the profile, with tilt shown in red when the link is obstructed. For links above 99.9% availability, antenna heights should be set so the grey line stays out of the Fresnel zone. — [LINKPlanner docs: Profile](https://lp.cambiumnetworks.com/doc/profile.html)
- Users can add obstructions and edit path profiles. — [Cambium community](https://community.cambiumnetworks.com/t/how-to-add-obstructions-and-edit-path-profiles/40031); a user asks about the meaning of the profile lines (red line "in the ground") — [Cambium community](https://community.cambiumnetworks.com/t/linkplanner-v4-3-5-meaning-of-lines-in-profile-red-line-always-seems-to-go-in-the-ground/42735)
- The docs index lists pages for the SRTM technical guide (NASA/USGS/Univ. Maryland), ASTER in the glossary, LiDAR (in the Terragraph/60 GHz distribution planner), Fresnel zone radius, fade margin (LoS and NLoS), MCS, link and project BOM, reports, and Google Earth/KML export. — [LINKPlanner docs index](https://lp.cambiumnetworks.com/doc/genindex.html); [Verifying a link end using a map and Google Earth](https://lp.cambiumnetworks.com/doc/verifying_a_link_end_using_a_map_and_google_earth.html)
- Availability is "the amount of time that a link is predicted to be above a given threshold (the fade margin)", expressed as an annual percentage. Selectable models are ITU-R P.530-12 (2007), P.530-17 (2017, default) and P.530-19 (2025), plus Vigants-Barnett. For Vigants-Barnett, climatic factors are taken at the path midpoint, terrain roughness is computed from 50 points across the central 80% of the path, and ITU ESATEMP temperature data handles the worst-month-to-annual conversion. Gaseous absorption and rain use "the relevant ITU recommendations". — [LINKPlanner docs: Availability](https://lp.cambiumnetworks.com/doc/availability.html)
- The performance summary separates "Lowest Mode Availability" (basic link operation in the most robust modulation) from "Min IP Availability Predicted". For PTP 820/850 under FCC rules there is "FCC 99.95%" at minimum payload in adaptive mode. For 60 GHz cnWave and PTP 820/850, the 0.01% rain rate comes from ITU-R P.837 (1.25° global grid) and rain availability from P.530. The link budget shows FSPL, gaseous absorption, excess path loss (obstruction), system gain margin and total path loss. Throughput can depend on frame size (RFC2544 64–1518 B, "Tolly Mix"). — [LINKPlanner docs: Performance summary](https://lp.cambiumnetworks.com/doc/performance_summary.html)
- v6.4.2 (released 10 June 2026) added ITU-R P.530-19, project-level "Revert Profile", custom styling for PTP/PMP/Mesh, product-list search, support for PTP 820/850, ePMP 4000 and PMP 450, and 6 GHz AFC calculations. — [Cambium blog, LINKPlanner v6.4.2](https://www.cambiumnetworks.com/blog/linkplanner-v6-4-2-more-accurate-planning-easier-project-control-and-expanded-product-support/); [Community release note](https://community.cambiumnetworks.com/t/linkplanner-v6-4-2-now-released/108473)
- cnHeat is a paid subscription (1- or 3-year) RF heat-map service built on LiDAR/GIS data at up to 1 m resolution, covering up to 12 miles (19.3 km), with a LOS/NLOS model for coverage behind trees and buildings. cnHeat 2.0 was announced in March 2022. — [TotalTele press release](https://totaltele.com/cambium-networks-cnheat-2-0-network-planning-subscription-service-enables-fixed-wireless-broadband-network-operators-to-optimize-site-performance-faster/); [cnHeat product page](https://cambiumnetworks.com/products/software/cnheat)
- Corporate status: Cambium Networks Ltd filed a notice of intention to appoint administrators on 10 September 2026, with RSM UK as joint administrators. Cambium Networks Corp was delisted from Nasdaq in March 2026, and about 260 job cuts (more than 53% of staff) were announced. The LINKPlanner product page header also mentions the administration. — [DatacenterDynamics](https://datacenterdynamics.com/en/news/uk-broadband-firm-cambium-networks-enters-administration); [ISPreview](https://www.ispreview.co.uk/?p=48018); [Cambium LINKPlanner page](https://cambiumnetworks.com/products/software/linkplanner)

### Inferences
- LINKPlanner's profile conventions (LOS line, 0.6F1 envelope, worst-case-k earth line, colour-coded clutter) are the de facto WISP standard. Our Cesium/Chart profile could reuse them and add a k=4/3 versus worst-case-k toggle.
- Separating "lowest mode availability" from availability at each MCS is the clearest industry way to show adaptive modulation against fade margin. Our QPSK→1024-QAM table could show an availability % per mode in the same way.
- Because of the 2026 administration, the long-term availability of a free LINKPlanner is uncertain. That is a useful point for positioning an open academic tool.

### Gaps
- The LINKPlanner datasheet PDF returned 404. I could not confirm whether the 5.8 GHz unlicensed PTP products (PTP 550/670/700) include rain in availability, or only multipath. The docs only state rain explicitly for 60 GHz and PTP 820/850.
- I did not fetch the exact report export formats (PDF/Word/Excel).

## Mimosa Design (Mimosa by Airspan)

### Takeaway
Mimosa Design is a free, cloud-based planner (cloud.mimosa.co). It offers PtP installation reports with heading and tilt, an in-browser link "fly-through" (no Google Earth needed), viewshed AP coverage heat maps that account for terrain, weather, tree clutter and interference, and FCC licensed-link assistance.

### Cited Findings
- It offers PtP planning with "a detailed installation report" (heading and tilt guidance) and link fly-through testing for LOS "without the installation of the Google Earth application". It has an updated access-point planner and an FCC Licensed Link Assistant (shows FCC towers and licensed links, and sends links to a frequency coordinator). It is reached through the cloud.mimosa.co login. — [Mimosa design tool page](https://mimosa.co/design-tool); [Mimosa blog: updated design tool](https://mimosa.co/blog/updated-mimosa-design-tool)
- Viewshed-based AP coverage planning calculates link performance and reliability automatically, accounting for terrain elevation, weather, tree clutter and interference, with heat-map visualisation. — [Mimosa design tool / blog (search summary)](https://mimosa.co/blog/updated-mimosa-design-tool)

### Inferences
- The "fly-through" along the path is a 3D UX pattern that maps directly onto Cesium: a camera flight along the link line.

### Gaps
- No public detail on which propagation model or rain model is used, or what the DEM resolution is. Mimosa's 2026 corporate status (Airspan restructuring) was not verified.

## Siklu (now "Siklu by Ceragon"): SmartHaul Link Budget Calculator and WiNDE

### Takeaway
Siklu's mmWave (60/70/80 GHz) tools are web/cloud tools built around rain: an online link budget calculator that estimates availability versus distance from 40 years of rainfall data, and WiNDE, which automatically designs mmWave networks with BOM and configuration files.

### Cited Findings
- The SmartHaul Link Budget Calculator is "a highly accurate, online, cloud-based tool". It estimates availability versus distance, uses "40 years of rainfall data, to simulate real-world conditions", helps choose products and antennas, and documents the link plan. — [Ceragon: Siklu network operations apps](https://www.ceragon.com/products/siklu-by-ceragon-network-operations-apps)
- WiNDE (Wireless Network Design Engine) takes all the locations to be served, applies cost and performance factors, recommends an optimal mmWave network, and creates a BOM and configuration files. — [Ceragon: Siklu apps](https://www.ceragon.com/products/siklu-by-ceragon-network-operations-apps); [WiNDE launch webinar](https://www.siklu.com/?p=6261)
- siklu.com/support/smarthaul-software-tools now redirects (301) to ceragon.com, which confirms the brand has been absorbed into Ceragon. — [Ceragon redirect target](https://www.ceragon.com/products/siklu-by-ceragon-network-operations-apps)
- Ceragon also lists a separate "link budget calculator" product page. — [Ceragon link budget calculator](https://www.ceragon.com/products/link-budget-calculator)

### Inferences
- At mmWave, rain decides availability and distance (hence "availability vs distance" curves). At 5.8 GHz over 3.69 km, rain attenuation is small and multipath/fade margin dominate. A side-by-side "5.8 GHz vs 60/80 GHz" rain-fade panel (ITU-R P.838 specific attenuation) would be a strong teaching feature.

### Gaps
- The Ceragon link budget calculator page was not fetched. Which ITU-R recommendations it uses (P.530/P.837/P.838) is not confirmed.

## Aviat Networks: Aviat Design (and the Pathloss legacy)

### Takeaway
Aviat Design is a free, cloud-based, multi-vendor RF planner for PtP and PtMP. It offers antenna-height optimisation, LOS MIMO modelling, Google Maps, LiDAR terrain and FCC tower data, and real-time team collaboration. Pathloss (desktop) remains the classic licensed-microwave reference tool built on ITU-R P.530.

### Cited Findings
- Aviat Design is a "full-featured, cloud-based RF planning solution" for PtP and PtMP. It is free, with no licence or subscription. Features include antenna-height optimisation, LOS MIMO modelling, bulk site import, Google Maps, LiDAR terrain and FCC tower data integration, and multi-vendor support. It supports shared projects, permissions and real-time collaboration, with no installs or updates. — [Critical Comms: Aviat Design RF planning tool](https://www.criticalcomms.com.au/content/research/product/aviat-design-rf-planning-tool-874024589)
- Aviat investor press releases on the launch. — [Aviat investors node 14401](https://investors.aviatnetworks.com/node/14401) (fetch timed out); [Aviat investors node 15746](https://investors.aviatnetworks.com/node/15746)
- Pathloss is a comprehensive tool for designing microwave radio links and is widely used together with ITU-R P.530. — [TechJunction: Microwave transmission guide with Pathloss](https://techjunction.co/download/microwave-transmission-guide-with-pathloss-planning-tool/)
- ITU-R P.530 is "one of the most widely used methods" for designing terrestrial LOS links. — [Bilkent repository, P.530-15 terrain roughness paper](https://repository.bilkent.edu.tr/items/96e07f78-0268-4b4b-b85b-c997bbac9372)

### Gaps
- The Aviat Design launch date, ITU-R model versions and report format were not confirmed (the press-release fetch timed out). Nokia and Ericsson microwave planners were not researched. Pathloss licensing and price were not verified.

## Other vendor and third-party tools (InfiNet, HFCL, MikroTik, RF elements, Tarana, IgniteNet, LinkCalc)

### Takeaway
InfiNet's InfiPLANNER (cloud) and HFCL's LinkXpert are examples of path-profile planners with a Fresnel-obstruction indicator and capacity output. MikroTik only had a basic web calculator. For Tarana, IgniteNet, RF elements and "LinkCalc" I found no reliable primary sources within the time available.

### Cited Findings
- InfiPLANNER (InfiNet Wireless) is a cloud PtP planning service. It visualises the path profile and flags first-Fresnel-zone obstruction, computes expected link capacity for clear LoS and near/non-LoS, and estimates availability by climate zone. It uses "ITU-R P.540 [sic] and Longley-Rice propagation models", with two modes: "Abstract Line of Sight" for pre-sales and "Geo-based" planning. — [Intelligent CIO](https://www.intelligentcio.com/me/?p=7699). Note: "P.540" is probably a typo in the source for P.530 or P.526; this is unverified.
- HFCL LinkXpert simulates fixed-wireless links, accounting for geography, distance, antenna height, power, terrain profiles and Fresnel zones. — [HFCL LinkXpert](https://io.hfcl.com/linkxpert)
- MikroTik had a basic web link calculator at mikrotik.com/test_link.php. Forum users have asked for link-planner software. — [MikroTik forum: request link planner](https://forum.mikrotik.com/t/request-link-planner-software/51811); [MikroTik forum: link calculation source code](https://forum.mikrotik.com/t/mikrotik-link-calculation-source-code/51558)
- RF elements has a "Link Tool" that users compare with Cambium LINKPlanner. — [Cambium community: RF Element Horns](https://community.cambiumnetworks.com/t/rf-element-horns/55944)
- Open-source building block: RFAnalysisJS (Inveneo) is a JavaScript library for Fresnel-zone intrusion analysis of PtP links. — [GitHub inveneo/RFAnalysisJS](https://github.com/inveneo/RFAnalysisJS)
- Internet Society published an overview of radio planning software. — [ISOC Radio Planning Software PDF](https://www.internetsociety.org/wp-content/uploads/2017/10/Radio-Planning-Software.pdf) (not fetched)

### Gaps
- Tarana (ngFWA planning), IgniteNet, RF elements Link Tool details, LinkCalc and "Wireless Link Planner": no reliable sources found. Nokia and Ceragon IP-20 planners were not researched. The MikroTik calculator's current availability was not verified.

## Cross-cutting: adaptive modulation vs fade margin, rain at 5.8 GHz vs mmWave, common UX patterns

### Takeaway
Common patterns across tools: pick two points on a map; an elevation profile chart showing terrain, clutter, the LOS line, a 0.6F1 ellipse and a k-factor earth line; antenna-height adjustment or automatic optimisation; a link budget/performance summary; availability per modulation mode; BOM; installation/PDF reports; Google Earth/KML or in-browser 3D fly-through. Rain dominates at mmWave (Siklu, cnWave), while at 5–6 GHz planners focus on multipath (P.530) and fade margin.

### Cited Findings
- Profile with LOS, 0.6F1 and worst-case Ke earth curve; colour-coded clutter and obstructions; azimuth and tilt. — [LINKPlanner Profile](https://lp.cambiumnetworks.com/doc/profile.html)
- Availability defined against the fade margin; lowest-mode availability for adaptive modulation. — [LINKPlanner Availability](https://lp.cambiumnetworks.com/doc/availability.html); [Performance summary](https://lp.cambiumnetworks.com/doc/performance_summary.html)
- Rain (P.837 rain rate + P.530) is applied explicitly for 60 GHz cnWave and the PTP 820/850 licensed products. — [Performance summary](https://lp.cambiumnetworks.com/doc/performance_summary.html)
- mmWave tool built around rain: availability versus distance from 40 years of rainfall data. — [Ceragon/Siklu](https://www.ceragon.com/products/siklu-by-ceragon-network-operations-apps)
- 3D/fly-through LOS check: Mimosa in-browser fly-through; Cambium Google Earth export. — [Mimosa](https://mimosa.co/design-tool); [LINKPlanner Google Earth](https://lp.cambiumnetworks.com/doc/verifying_a_link_end_using_a_map_and_google_earth.html)
- LiDAR is now standard in the leading tools: UISP Design Center, Aviat Design, cnHeat. — [UISP help](https://help.uisp.com/hc/en-us/articles/22590760757783-ISP-Wireless-Plan-Build-Scale-Your-Business-With-UISP-Design-Center); [Critical Comms](https://www.criticalcomms.com.au/content/research/product/aviat-design-rf-planning-tool-874024589); [TotalTele](https://totaltele.com/cambium-networks-cnheat-2-0-network-planning-subscription-service-enables-fixed-wireless-broadband-network-operators-to-optimize-site-performance-faster/)
- Cloud/web delivery is now the norm (UISP Design Center, Mimosa, Aviat Design, InfiPLANNER, Siklu). LINKPlanner is still also a desktop app. — sources above.

### Inferences
- Positioning: the vendor tools are free but locked to one vendor's products (except Aviat Design), and they hide their maths. An academic simulator can stand out through transparency: step-by-step formulas, ITU-R references, k-factor sensitivity, a Fresnel-clearance %, a rain-fade comparison between 5.8 GHz and mmWave, and an animated modulation step-down as the fade deepens. It can also focus on Mozambique and Maputo, using SRTM data where LiDAR is not available.
- The LiDAR and building data that the US-focused tools rely on (FCC towers, US LiDAR) are mostly missing for Maputo. Global SRTM/ASTER (which LINKPlanner also uses) and OSM buildings are the realistic inputs.

### Gaps
- No direct side-by-side evidence of how each tool presents MCS throughput tables. Pricing for cnHeat and Aviat enterprise tiers is not quantified. Screenshots and UX details for UISP Design Center were not verified from primary docs.
