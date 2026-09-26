# Venues worth tracking: Australia and New Zealand

**Slow Folk, Neighbourhood Sauna · Venue research**

Research to 2026-09-24 · 101 venues checked in two rounds (28 New Zealand brands, 73 Australian) · Companion to BOOKING-PLATFORM-RESEARCH.md, which already covers 52 other Australian venues and is not repeated here.

This report answers one question: which other sauna and hot or cold plunge venues in Australia and New Zealand should we add to the tracker to build evidence for investors. A venue is worth adding when it is a fair comparison to Slow Folk (small, communal, neighbourhood scale) and when we can pull real booking data from it.

Definitions used throughout: "supported platform" means one the tracker already reads (Momence, TryBe, Acuity, Hapana, MarianaTek), so adding the venue is a config entry, not new code. "Page checked" means I loaded the venue's booking page and saw that platform's code in it. "Reported" means a research agent read it but the site would not load for me, so treat it as likely, not confirmed. Prices are advertised prices, not what customers actually pay.

## Contents

1. [The short answer](#1--the-short-answer)
2. [Add first: venues on platforms we already read](#2--add-first-venues-on-platforms-we-already-read)
3. [Worth a new client: platform is feasible but not built](#3--worth-a-new-client-platform-is-feasible-but-not-built)
4. [New Zealand](#4--new-zealand)
5. [New openings for ramp evidence](#5--new-openings-for-ramp-evidence)
6. [What this adds to the investor case](#6--what-this-adds-to-the-investor-case)
7. [Not worth chasing](#7--not-worth-chasing)
8. [The three unresolved platform probes](#8--the-three-unresolved-platform-probes)
9. [Limits of this research](#9--limits-of-this-research)
10. [Suggested order](#10--suggested-order)

## 1 · The short answer

1. **Ten venues can be added with config only**, six of them page checked on Momence, plus two on TryBe, one on Hapana and one reported on Acuity (Table 1). None of the ten is in Melbourne, so they widen the evidence, not just repeat it.
2. **We track no New Zealand venue today.** Three New Zealand venues are ready now (Cora Studio, Renew Wellness Place, The Bathhouse Queenstown) and two more contrast therapy studios sit on Acuity.
3. **Wix Bookings is the best platform to build next.** Capybara Bathing (Surry Hills) and Drift Saunas (Perth) are both on it, and the earlier research showed Wix is the only platform that lets us backfill real history.
4. **Only one new opening can be tracked for ramp evidence**: The Bathhouse Albion in Brisbane, opened 29 June 2026. Löyly Recovery in Perth (opened early 2026) is a second, on Momence.
5. **Many good small venues cannot be tracked at all.** Some run on Fresha or FareHarbor, which do not publish seat counts, and some have no booking system. That matters for the walk in model: a walk in venue leaves no booking record anywhere, so its occupancy can only come from the operator or from counting.

## 2 · Add first: venues on platforms we already read

**Table 1.** Ordered by how closely each matches Slow Folk. Fit is high, medium or low against the positioning: small, communal, neighbourhood scale.

| Venue | Where | Platform | Advertised price | Why it matters | Fit | Platform check |
| --- | --- | --- | --- | --- | --- | --- |
| Cora Studio | Grey Lynn, Auckland | Momence | NZ$40 drop in; memberships NZ$55 to 99 a week | Single site, shared sessions of up to 6, weekly membership ladder close to ours. First New Zealand data. | High | Page checked |
| Renew Wellness Place | Parnell, Auckland | Momence | NZ$45 for 60 minutes rooftop communal (up to 9); NZ$75 for 30 minutes private | Communal plus private mix, the same shape as our private product. | High | Page checked |
| Onsen Sauna and Recovery | Torrensville, Adelaide | Momence | 5 pack $110; weekly memberships $49 to 69 | Communal sauna with cold plunge and weekly memberships, in a city we already track through Aalto. | High | Page checked |
| Löyly Recovery | Shenton Park, Perth | Momence | Memberships offered, prices not public | Opened early 2026, communal sauna, hot and cold plunge, 12 per hour cap. A live ramp curve. | High | Page checked |
| The Wellness Studio | Belmont, Geelong | Momence | $30 communal for 75 minutes; $25 women only | Single strip shop, wood fire sauna and cold plunge. Cheapest genuine comparable, and the closest to Slow Folk's scale. | High | Page checked (an agent said Acuity; the page shows Momence) |
| Genki Vitality | Auckland | Acuity | NZ$35 for 55 minutes hot and cold | Small single site studio with sauna and cold plunge pools. | High | Reported (site blocks automated loading) |
| RCVRI | Coogee, Cronulla, Manly, Martin Place | Hapana | $45 casual; memberships $39 to 79 a week for 2 to 8 sessions | Five studio chain, ice bath led. Useful for the weekly membership range, less so as a neighbourhood match. | Medium | Page checked |
| Native State | Kirra, Gold Coast | Momence | From $49 for 45 minutes; 3 pack $129 | Premium beachfront bathhouse. A price ceiling, not a peer. | Medium | Page checked |
| The Bathhouse Albion | Albion, Brisbane | TryBe | $64 off peak, $74 peak, 60 minutes | Large ten space circuit, more commercial than Slow Folk, but it is the one tracked new opening (section 5). | Medium | Page checked |
| The Bathhouse Queenstown | Queenstown | TryBe | NZ$69 for 60 minutes (group of 4) | Larger commercial venue, but a second New Zealand market and a tourist season signal. | Medium | Page checked |

Also on supported platforms but weaker matches: Onda (Dunedin) and Contrast Therapy (Omokoroa) on Acuity, both page checked, prices only on their booking pages. Scout Studios Redfern and Suelta Saunas (a mobile trailer) on Momence, reported. Cedar and Salt (a pop up in Manly) on MarianaTek, page checked.

## 3 · Worth a new client: platform is feasible but not built

Building one client unlocks several venues, so group by platform, not by venue.

**Table 2.** Venues on platforms the earlier research judged feasible. Each needs its client written first.

| Platform | Venues | Fit | Notes |
| --- | --- | --- | --- |
| **Wix Bookings** | Capybara Bathing (Surry Hills, $65 off peak, $70 peak, 90 minutes); Drift Saunas (East Fremantle, $25 single, $39 a week unlimited) | High, medium | Best next build. Real history backfill, and the earlier memo scoped it at about 1.5 days. Capybara is a boutique communal bathhouse and a strong peer. An agent reported Capybara as Acuity; its booking page shows Wix. Drift's site is Wix but its booking widget is inferred, not confirmed. |
| **Mindbody** | Tory Urban Retreat (Wellington); Steam and Stone (Wollongong); Recovery Lab (Maribyrnong, private suites) | High, high, medium | Tory and Steam and Stone are small communal venues. Mindbody only works where a venue leaves availability display on. 1Remedy showed what happens when it is off (no seat counts), so check each venue before building. |
| **Zenoti** | Vikasati Bathhouse (3 sites, $49 for 90 minutes, $29 a week membership); About Time (Torquay); Hana (Parnell, private suites, NZ$110) | Medium | Largest unlock, most caveats, about 5 days. Worth it mainly because it also reaches Soak, The Banya and Nature's Energy from the earlier list. |
| **GymMaster** | Si Sauna and Ice (Mooloolaba, high fit); Brunswick Fire and Ice Recovery Gym (Brunswick, low fit) | High, low | Brunswick Fire and Ice is a gym add on with an infrared sauna, $20 for 40 minutes, but it sits in Slow Folk's own suburb, so it is worth knowing about as a local price marker even if it is a poor comparison. One agent read Si Sauna's booking as Gymflow; its page mentions GymMaster, so confirm before building. |

## 4 · New Zealand

Twenty eight New Zealand brands were checked. Most are small contrast therapy studios, often with private infrared suites, so New Zealand gives us fewer true communal saunas than Melbourne.

**Ready now (config only):** Cora Studio, Renew Wellness Place and Genki Vitality (Auckland); The Bathhouse Queenstown; Onda and Contrast Therapy on Acuity.

**Feasible, needs a client:** Tory Urban Retreat (Wellington, Mindbody, high fit) and Hana (Auckland, Zenoti).

**Real venues, data path unknown:** O Studio (a multi site chain with its own booking app), The Secret Sauna (Lake Hāwea and Cardrona, SimplyBook.it, NZ$32 per person per hour shared), SALA (Ponsonby), The Cold Plunge Co (Mount Albert, likely a good fit but its site would not load), Blueberry (Christchurch), Thermae by Aluume (Queenstown floating sauna).

**Not trackable:** Watershed Saunas and Wellspace (Queenstown, both FareHarbor), Sauna Collective and R and R Ice Bath and Sauna Studio (Fresha), Recovery Hub Wellington (Fresha). The Sauna Project runs about fifteen mobile saunas on Periode and is a poor comparison.

New Zealand prices are quoted in NZ dollars and have not been converted.

## 5 · New openings for ramp evidence

Ramp evidence is what the Ramp Scenarios tab needs most, and it is the hardest to get.

| Venue | Status | Trackable |
| --- | --- | --- |
| The Bathhouse Albion, Brisbane | Opened 29 June 2026 | Yes, TryBe |
| Löyly Recovery, Perth | Opened early 2026 | Yes, Momence |
| else BATHHOUSE, South Melbourne | Now says 2027, mailing list signup only | No booking yet |
| BODHI Bathhouse and Spa, Hobart | Hotel spa, opening November 2026 | No booking yet |

Seen in discovery but not checked: Rebuild Recovery (Norwood, opened March 2026), Level Eleven (Adelaide, spring 2026), VELA Spa and Bathhouse (Hawkesbury, 22 September 2026). NAIA Spa (North Adelaide) is a premium gym add on and a poor comparison.

## 6 · What this adds to the investor case

1. **A second market.** New Zealand venues on Momence and TryBe give us evidence from outside Australia without any new code.
2. **A range for weekly membership pricing.** Advertised weekly memberships across these venues run from $29 (Vikasati) and $39 (Drift, RCVRI) up to NZ$55 to 99 (Cora), against Slow Folk's $52 to $88. That supports the ladder as sitting inside the market, though these are advertised prices, not sold volumes.
3. **Small, single site peers outside Melbourne.** Onsen (Adelaide), The Wellness Studio (Geelong), Löyly (Perth) and Cora (Auckland) are all single site and communal, which is the strongest kind of comparison.
4. **A local price marker.** Brunswick Fire and Ice sits in Slow Folk's suburb at $20 for 40 minutes. It is an infrared gym add on, so it is a floor for the area, not a competitor to the communal wood sauna.

## 7 · Not worth chasing

- **Fresha venues.** Fresha has no capacity in its data, so a venue on it cannot be tracked. This rules out Sauna Amalfi, Zadig Studio, Sweat Chill Exhale, Comma, The Byron Bathhouse, Nimbus Co, My Recovery Lounge, FICE Recovery, Sauna Collective, R and R and Recovery Hub Wellington.
- **FareHarbor venues.** No reliable seat counts (Watershed, Wellspace, Wellness Afloat).
- **No booking system.** Sauna and Spa (Dunedin), else BATHHOUSE, BODHI and Drip. (floating saunas on the Sunshine Coast) have no bookable sessions to read.
- **Mobile, floating and event only saunas.** Different product, different metric.
- **1Remedy.** An agent rated it high and trackable this round, but the 22 September retest found its availability display is switched off, so seat counts are not published. Do not add it.
- **Private suite studios inside clinics and gyms.** WYLD (Auckland), CHANGE (North Adelaide) and similar are poor comparisons.

## 8 · The three unresolved platform probes

The earlier research left three platforms unproven. I ran a probe on each. Two were flagged by the safety classifier as third party attack, and I stopped there rather than push further.

| Platform | Venue | Result |
| --- | --- | --- |
| Roller | TANK Bathhouse (Mooloolaba, Bli Bli) | The probe found a public availability endpoint that returns day level status (available, filling, full). It did not confirm sold or remaining counts, and the run was flagged and cut short. Still unproven. |
| NetBookings | The Bathhouse at Ground (Currumbin) | A party size sweep appeared to reveal per slot capacity (13 slots at 1 guest, 7 at 4, 4 at 7). The replay was blocked by the classifier, so it is not confirmed end to end. It may also reopen the Peninsula Hot Springs verdict. Still unproven. |
| Periode | The Sauna Project | Stopped before any probing. The booking screen sits behind a login. Still unproven, and a poor comparison anyway (mobile saunas). |

For the two that reached the classifier, I would not build on the results. The safer path, and a stronger one for investors, is to ask the operator for anonymised occupancy directly.

## 9 · Limits of this research

1. **Light checks.** Each venue got a short check of about five tool calls. Prices and formats come from public pages and were not confirmed with operators.
2. **Platform claims.** I loaded the booking pages for 36 venues that claimed a supported or feasible platform. I saw the platform on the page for 29 and corrected two agent reports (Capybara is Wix, not Acuity; The Wellness Studio in Geelong is Momence, not Acuity). Seven sites would not load for me (Genki Vitality, Recovery Lab, 1Remedy, Xtra Clubs Manly, Slow House, Those Floating Saunas, Suelta Saunas), so their platforms stay reported.
3. **Advertised prices only.** None of these prices show what customers pay or how full a venue runs. That is what tracking is for.
4. **Coverage.** The discovery rounds returned about 240 distinct candidates and I verified 101. Roughly 80 Australian and 10 New Zealand names were not verified because they were mobile, gym based, private suite only, or too far from Slow Folk's positioning to justify the check.
5. **Walk in venues.** Venues with no booking record cannot be benchmarked this way.

## 10 · Suggested order

1. Add the ten Table 1 venues, starting with Cora Studio, Renew Wellness Place, Onsen and Löyly. Each needs its host id found, following ADDING-A-VENUE.md.
2. Build the Wix client next, for Capybara and Drift plus the four Wix venues already scoped in BOOKING-PLATFORM-RESEARCH.md.
3. Ask three to five of the closest peers (Cora, Onsen, Löyly, Tory Urban Retreat) whether they would share anonymised occupancy. Data an operator agrees to share is a stronger investor exhibit than data pulled from a public booking page.
4. Decide whether the Mindbody and Zenoti builds are worth their cost for this raise, or whether the supported platforms already give enough evidence.

---

*Slow Folk venue research · created 2026-09-24 from the sauna-session-stats tracker · run journals and per venue results available on request.*
