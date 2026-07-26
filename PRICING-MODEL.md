# A pricing model built from venue data

**Slow Folk — Neighbourhood Sauna · Pricing concept**

Data to 2026-07-21 · eleven venues · 144,389 recorded sessions · Melbourne, Adelaide, Perth, Sydney, Zurich

This document designs a pricing model from the booking data we collect, and from nothing else. No market study, no assumed price sensitivity. Every rule below answers to a number we measured. It is a concept for review, not a final price list. Companion document: [VOLUME-FORECAST.md](VOLUME-FORECAST.md).

Definitions used throughout: occupancy = tickets sold ÷ seats offered. ARPV = average revenue per visit. Capacity = 868 visits per week. Prime, Standard and Quiet are the three time bands defined in section 3.

## Contents

1. [What the data says about price](#1--what-the-data-says-about-price)
2. [Design principles](#2--design-principles)
3. [The time bands](#3--the-time-bands)
4. [The products and prices](#4--the-products-and-prices)
5. [The neighbourhood layer](#5--the-neighbourhood-layer)
6. [Member visits per week: how to calculate it](#6--member-visits-per-week-how-to-calculate-it)
7. [What the model earns](#7--what-the-model-earns)
8. [Sensitivity and risk](#8--sensitivity-and-risk)
9. [Problems in the current sheet](#9--problems-in-the-current-sheet)
10. [What to test before launch](#10--what-to-test-before-launch)
11. [Limits of this analysis](#11--limits-of-this-analysis)

## 1 · What the data says about price

**Finding 1. A lower price does not fill a venue.** Across nine Australian venues, the relationship between ticket price and occupancy is +0.16 — effectively none, and slightly positive. The cheapest venue in the panel is close to the emptiest. The most expensive Melbourne venue is the fullest.

| Venue | Price | Occupancy |
| --- | --- | --- |
| Sense of Self (Melbourne) | $68 | 92% |
| Inner Studio Collingwood | $47 | 80% |
| Sauna Goose | $30 | 72% |
| Aalto (Adelaide) | $35 | 64% |
| Inner Studio South Yarra | $47 | 63% |
| Alchemy (Perth, 8 sites) | $20–$35 | 53% |
| EQ (Melbourne) | $95 | 50% |
| The Corner Sauna | $40 | 39% |
| Sol Sauna | $30 | 37% |

Prices are current at 2026-07-21. Inner Studio raised both locations from $45 to $47 on 1 July 2026, and the occupancy shown is measured over the period before that rise. Alchemy prices by location, not by time — see Finding 7.

The conclusion is not that a high price creates demand. It is that in the observed range of $28 to $95, price is not what decides whether a venue fills. Product, location and reputation decide it. A price war is therefore the wrong strategy: it would remove revenue without adding visits.

**Finding 2. Demand is very uneven across the week, and our seats are in the wrong places.** Pooled across all southern-hemisphere venues:

| Band | Occupancy | Share of visits | Share of seats |
| --- | --- | --- | --- |
| Weekday evening (17:00+) | 76.6% | 19.6% | 15.0% |
| Weekday shoulder (15–17) | 73.5% | 12.0% | 9.5% |
| Weekend late (15:00+) | 71.2% | 11.3% | 9.2% |
| Weekend midday (10–15) | 67.2% | 11.8% | 10.2% |
| Weekend early (before 10) | 57.3% | 9.6% | 9.8% |
| Weekday midday (9–15) | 47.1% | 21.2% | 26.4% |
| Weekday early (before 9) | 42.6% | 14.5% | 19.9% |

Read the last two columns together. Weekday daytime holds 46% of all seats and runs at 43–47% occupancy. Weekday evening holds 15% of seats and runs at 77%. We sell the same product at the same price in both, although one is scarce and the other is close to half empty.

**Finding 3. Sunday is the strongest day everywhere, Thursday the weakest.** Sunday leads at every single venue: Inner Studio Collingwood 99%, Sauna Goose 92%, Aalto 89%, Alchemy 72%, Zurich 68%, Xtra 67%, Sol 53%. Thursday is the weakest weekday at seven of eleven venues. Sunday behaves like a peak, not like part of a flat "weekend" price.

**Finding 4. Small and private sessions fill better than communal sessions, at the same price or higher.**

| Venue | Private (1–4 seats) | Communal | Private price vs communal |
| --- | --- | --- | --- |
| Alchemy Saunas | 99% | 59% | same |
| Aalto | 85% | 57% | same |
| Inner Studio Collingwood | 85% | 74% | same |
| EQ | 76% | 53% | $81.60 vs $65.49 |
| Sense of Self | 92% | — | $68.47, and 96% of its visits are private |

Sense of Self is the clearest case: a Melbourne venue whose whole product is small private bathhouse sessions at $68, running at 92% occupancy. Private capacity is the highest-yield product we can see in the data, and we do not price it separately today.

**Finding 5. A direct competitor moved to time-based pricing two months ago, and it worked.** Sol Sauna charged a flat $30 from its opening in August 2025 until May 2026. In **June 2026 it split its price**: sessions are now named "Off Peak" ($30) and "Peak" ($35), with peak covering weekday afternoons and evenings from 15:00 and most of the weekend.

| Sol Sauna, June–July 2026 | Price | Sessions | Occupancy |
| --- | --- | --- | --- |
| Off Peak | $30 | 2,219 | 29.5% |
| Peak | $35 | 689 | 56.1% |

Two lessons. First, the venue with the price closest to a low-cost position chose to raise price at busy times rather than lower it at quiet ones — the same conclusion this document reaches from Finding 1. Second, their peak band definition (weekday from 15:00, plus weekend) is almost the same as the bands our own pooled data produces in section 3. Their premium is small (+17%); our proposal is wider, because our data shows a much larger gap in demand between the bands than $5 reflects.

**Finding 6. Blue Mountains Sauna shows the structure that solves our biggest risk.** [bmsauna.com.au](https://bmsauna.com.au/) is a popular venue in Leura, NSW. It is not in our tracker, so we have no occupancy data for it, and its trade is regional and weekend-led rather than neighbourhood-led. Its published structure is still instructive:

- **Memberships are capped, not unlimited**: $32/week for 2 morning visits, $56 for 2, $66 for 3, $76 for 4, $91 for 7.
- **Shared memberships exist**: "Shared Restore" $92/week for 4 visits between 2 people; "Shared Revive" $140/week for 14 visits between 2 people.
- **Packs are transferable**: valid 2 years and "shareable with companions present".
- **A pair offer targets the weakest day**: "2-for-1 Thursdays", $45 for two people. Thursday is the weakest weekday in our own data at seven of eleven venues.

The capped-membership idea directly answers the largest risk in section 8, and the shared and pair products are the mechanism for the neighbourhood layer in section 5.

**Finding 7. Inside one brand, the cheaper sites fill better than the dearer ones.** Alchemy runs eight Perth locations under one operator, and prices them in two groups — not by time of day, but by the site itself. Five premium sites (more saunas, magnesium pools, private showers) charge $35 drop-in / $40 per week unlimited. Four beach and river sites (ocean or river dip, public showers) charge $20 / $30.

| Alchemy group | Drop-in | Sites | Average occupancy |
| --- | --- | --- | --- |
| Premium ($35) | $35 | East Fremantle, West Leederville, Karrinyup, Scarborough | 48.4% |
| Beach & river ($20) | $20 | Port Beach, Point Walter, City Beach, Fremantle | 56.9% |

The cheaper group is 9 points fuller. This is not proof that a lower price fills a room — the beach sites are also better located and simpler to build, so price and product move together. But it is a clean example of the central point: **Alchemy sets price by what a site costs to build, and demand does not follow that price.** Port Beach at $20 (68% full) outsells every one of its $35 sites. It is the same lesson as Finding 1, now visible inside a single business.

A second lesson from Alchemy is about memberships. Its unlimited membership is $30–$40 per week, and its busiest site still only reaches 68% — an unlimited membership at a low price did not cause runaway use. Section 6 recommends capped tiers for Slow Folk anyway, but Finding 7 is the honest counter-argument: most of the market, Alchemy included, sells unlimited memberships and survives. The recommendation for caps rests on bounding *forecast risk*, not on a claim that unlimited memberships fail.

## 2 · Design principles

These follow from the seven findings in section 1.

1. **Price the time, not the customer.** The same sauna hour has very different value on a Tuesday morning and a Thursday evening. The price should say so.
2. **Do not discount to fill; give access instead.** Because price does not drive fill (Finding 1), a discount at a quiet time gains little. A membership that includes quiet times converts empty seats into recurring revenue without lowering the casual price.
3. **Protect prime capacity.** Prime seats are scarce (Finding 2). They should carry the highest price and should not be given away inside an unlimited membership.
4. **Sell privacy as a product.** Private sessions fill better and can carry a premium (Finding 4).
5. **Sell the building.** Slow Folk sits inside a residential community. Residents are the only customers who can fill a Tuesday morning without crossing a suburb, so the model gives them access to exactly the seats that are otherwise empty (section 5).
6. **Cap what you sell.** A membership should state the number of visits it includes. Frequency then becomes a term of the product rather than a risk in the forecast (section 6).
7. **Keep the structure small.** Three time bands and four core products. A member should understand the rule in one sentence.

## 3 · The time bands

Slow Folk opens 06:30–23:00, seven days: 116 hours and 868 visits per week (Venue Capacity tab). The bands below apply our measured demand shape to that grid.

**Table 1.** The band structure, with expected visits at the 41% base-case occupancy.

| Band | Hours | Seats/week | Expected visits | Occupancy | Tier |
| --- | --- | --- | --- | --- | --- |
| Weekday early | 6:30–9:00, Mon–Fri | 94 | 26 | 28% | Quiet |
| Weekday midday | 9:00–15:00, Mon–Fri | 225 | 70 | 31% | Quiet |
| Weekday shoulder | 15:00–17:00, Mon–Fri | 75 | 36 | 48% | Standard |
| Weekday evening | 17:00–23:00, Mon–Fri | 225 | 114 | 50% | **Prime** |
| Weekend early | 6:30–10:00, Sat–Sun | 53 | 20 | 38% | Standard |
| Weekend midday | 10:00–15:00, Sat–Sun | 75 | 33 | 44% | **Prime** |
| Weekend late | 15:00–23:00, Sat–Sun | 120 | 56 | 47% | **Prime** |

Prime is 45% of seats and takes 57% of visits. Quiet is 37% of seats and takes 27% of visits. That gap is the commercial opportunity.

## 4 · The products and prices

**Table 2.** Casual price by tier.

| Tier | When | Price |
| --- | --- | --- |
| Quiet | Weekdays before 15:00 | **$32** |
| Standard | Weekdays 15:00–17:00; weekends before 10:00 | **$44** |
| Prime | Weekday evenings; all weekend from 10:00 | **$55** |

Anchors from our own data: Sol $30 (37% full), Aalto $35 (64%), Inner Studio $47 (80%), Sense of Self $68 (92%). A $55 prime price sits between Inner Studio and Sense of Self, in a market where both are fuller than anything cheaper. Against Inner Studio's single $47 rate, our Quiet price is 32% lower and our Prime price is 17% higher — we are cheaper than the market leader for most of the week, and dearer only when seats are scarce.

**Table 3.** The four products.

| Product | Price | What it includes | Why |
| --- | --- | --- | --- |
| **Casual visit** | $32 / $44 / $55 by tier | One visit | Prices scarcity (Finding 2) |
| **10-pack** | 15% below the tier price ($27 / $37 / $47 per visit) | Ten visits, valid 12 months, **transferable** | Rewards commitment; transferability serves the building (section 5) |
| **Membership** | **Capped weekly tiers, $34–$88** (Table 4) | A set number of visits per week in Quiet and Standard. Prime costs **+$18** each | Sells the half-empty 46% of seats (Finding 2), protects prime, and makes frequency a contract term instead of a risk (section 6) |
| **Private session** | **$75 per person**, minimum 2 | Whole room, up to 6 people | Highest-yield product in the data (Finding 4) |

**Table 4.** The membership ladder. Every tier is capped, following Finding 6. "Break-even" is the number of visits per week at which the membership beats buying a 10-pack — a member below that line should buy a pack instead, and will leave if we sell them the wrong tier.

| Tier | Fee/week | Visits included | People | Effective $/visit | Break-even |
| --- | --- | --- | --- | --- | --- |
| Early | $34 | 2, Quiet only | 1 | $23.61 | 1.26 |
| Two | $41 | 2, Quiet + Standard | 1 | $28.47 | 1.37 |
| Three | $62 | 3 | 1 | $28.70 | 2.00 |
| Four | $76 | 4 | 1 | $26.39 | 2.45 |
| **Household** | **$88** | **4, shared between 2 people** | **2** | $30.56 | 2.84 |
| **Resident** | **$52** | **3, residents of the building** | 1 | $24.07 | 1.76 |

Effective $/visit assumes members use 72% of their entitlement (section 6). Our own benchmarks span this range: Alchemy charges $30–$40 per week unlimited, Inner Studio $50 (class-only) and $75 (full), KEEN Zurich CHF 249 per month, and Blue Mountains Sauna $56–$91 per week for 2–7 visits. Most of these are unlimited; only Blue Mountains caps by visit, as we propose.

Two supporting rules, both already sketched in the Pricing tab:

- **Guest pass $35.** A member may bring one guest at $35 in Quiet and Standard bands.
- **No-show fee $20.** Applies to a booking cancelled less than 12 hours before the session. Prime bookings are scarce, so a no-show has a real cost.

## 5 · The neighbourhood layer

Slow Folk sits on level 1 of a multi-residential building with an established community. That is a structural advantage no venue in our panel has, and the pricing should use it. Three of the products above carry the layer; two more are added here.

**Why this matters commercially.** Residents live upstairs. Their travel cost is a lift ride, so they are the only customer group that can realistically fill the Quiet bands on a Tuesday morning — the 46% of seats running below 48% occupancy (Finding 2). Every other venue must persuade someone to cross a suburb for an off-peak visit. We do not.

| Product | Price | Rule |
| --- | --- | --- |
| **Resident membership** | $52/week | 3 visits per week, Quiet and Standard. Proof of residence in the building. Prime at +$18 as normal. |
| **Household membership** | $88/week | 4 visits per week shared between two people at one address. Either person may use any visit. |
| **Transferable 10-pack** | $27–$47/visit by band | Valid 12 months. Any holder may use it, and may bring the people they are with. Follows the Blue Mountains model of packs "shareable with companions present". |
| **Neighbour hours** | Included in resident and household tiers | Two named Quiet sessions each week reserved for building residents until 24 hours before, then released to everyone. |
| **Pair rate, Thursday** | $55 for two people, Quiet or Standard | Our weakest day at seven of eleven venues. A pair offer on the weakest day is exactly the Blue Mountains "2-for-1 Thursdays" mechanic, aimed at the gap our own data identifies. |

Three design notes:

1. **The resident tier is a discount on price, not on access.** It costs $52 against $62 for the same three visits — 16% less — and it excludes Prime, which is where scarcity lives. We give away the seats we cannot otherwise sell.
2. **Sharing is deliberate, not tolerated.** A transferable pack and a two-person membership turn one buyer into two visitors, and a visitor who arrives with a neighbour is the cheapest form of marketing a neighbourhood venue has. The cost is that a shared membership yields less per person; the Household tier is priced for that ($88 for 4 shared visits, against $76 for 4 single visits).
3. **Neighbour hours release automatically.** Held seats that never release would waste the scarce capacity we are trying to protect. A 24-hour release keeps the promise to residents without holding empty rooms.

## 6 · Member visits per week: how to calculate it

The 1.61 figure in the sheet deserves the attention you gave it. Three separate problems:

**Problem 1 — it cannot be measured from our data.** Booking platforms give us sessions, seats and tickets. They do not give us customer identifiers, and they do not say which visit was paid by a membership. So no venue in our panel can tell us its real member frequency. Any single number here is an assumption, and should be labelled as one.

**Problem 2 — the current number is internally inconsistent.** At the sheet's own inputs, an unlimited membership of $45 per week divided by 1.61 visits gives **$27.95 per visit**. A 10-pack at the Quiet price gives $27.00 per visit. So a member who visits 1.61 times per week pays *more* per visit than a pack buyer, for the same seats. At that frequency, no rational customer joins. The number and the product contradict each other.

**Problem 3 — it is used as an input, but it behaves like an output.** In the sheet, memberships × frequency = member visits, while the member share of volume is also fixed at 40%. Two of those three numbers determine the third; setting all three creates the mismatch already noted in section 9.

### The recommended method

Make frequency a **product parameter, not a behavioural guess** — the Blue Mountains structure (Finding 6). Most competitors, including Alchemy, sell unlimited memberships instead (Finding 7), so this is the minority choice; it is made to bound forecast risk, not because unlimited memberships fail. Frequency is then calculated in four steps:

1. **Cap each tier.** A tier that includes 3 visits per week cannot produce 5. The contract sets the ceiling.
2. **Estimate one number only: utilisation** — the share of entitled visits a member actually takes. This is the single unknown, and it is measurable from week one.
3. **Weight across the tier mix**: `frequency = Σ (share of members in tier × visits included × utilisation)`.
4. **Check every tier against its break-even** (Table 4). A tier priced above its break-even will not sell, and a tier far below it gives away margin.

**Table 5.** The result, using the tier mix in Table 4.

| Utilisation | Member frequency | Average fee | Revenue per member visit | Memberships needed |
| --- | --- | --- | --- | --- |
| 60% (cautious) | **1.72 visits/week** | $56.96 | $33.12 | 83 |
| **72% (planning number)** | **2.06 visits/week** | $56.96 | $27.65 | 69 |
| 85% (heavy use) | **2.43 visits/week** | $56.96 | $23.44 | 59 |

Memberships needed = the count that delivers 142 member visits per week at the 41% base case.

**The reason to prefer this method is that it bounds the risk.** Under capped tiers, total subscription revenue moves between $3,337 and $4,714 per week across the full range of member behaviour — a 41% spread. Under an unlimited $49 membership, the same behavioural range moves revenue between $2,325 and $4,332 — an 86% spread. Capping does not raise the forecast; it halves the uncertainty around it.

**Use 2.06 visits per week as the planning number**, not 1.61, and record it in the sheet as a calculated cell with the tier mix and utilisation as its inputs. Then measure utilisation three ways: from the pre-sale cohort (the Venue Capacity tab already targets 220 pre-sale members), from the first 90 days of live bookings, and monthly thereafter. It is the one number in this model worth a dashboard.

## 7 · What the model earns

The simulation applies the measured demand shape to Slow Folk's weekly grid, splits visits by product mix (45% casual, 15% pack, 40% membership), and prices each visit by its band.

**Table 6.** How each design decision moves ARPV. The target from the Ramp Scenarios tab is $42.43.

| Structure | ARPV | Annual revenue at 41% |
| --- | --- | --- |
| Flat price everywhere (current model) | $38.74 | $717k |
| Time bands only | $39.92 | $739k |
| + private sessions (10% of visits) | $43.42 | $804k |
| + prime surcharge $18 instead of $12 | $44.66 | $826k |
| **Recommended (all of the above, prime $55, membership $49)** | **$47.24** | **$874k** |

**Table 7.** The recommended structure across the three volume scenarios from the forecast.

| Scenario | Visits per week | ARPV | Annual revenue | Members |
| --- | --- | --- | --- | --- |
| Conservative (30% occupancy) | 260 | $47.24 | $640k | 57 |
| **Base (41% occupancy)** | **356** | **$47.24** | **$874k** | **78** |
| Upside (52% occupancy) | 451 | $47.24 | $1,109k | 99 |

The base case earns $47.24 per visit against a $42.43 target. That headroom is a choice, not a windfall: it can be taken as revenue, or spent on a lower opening price to build the habit faster. My recommendation is to hold the structure and spend the headroom on the opening period (section 8).

## 8 · Sensitivity and risk

**Table 8.** ARPV under the recommended structure, one variable at a time.

| Variable | Values and resulting ARPV |
| --- | --- |
| Membership fee per week | $39 → $45.05 · $45 → $46.36 · **$49 → $47.24** · $55 → $48.55 · $60 → $49.64 |
| Prime casual price | $45 → $44.34 · $50 → $45.79 · **$55 → $47.24** · $58 → $48.11 · $62 → $49.27 |
| Private share of visits | 0% → $43.45 · 8% → $45.98 · **12% → $47.24** · 18% → $49.13 · 25% → $51.34 |
| Member visits per week | **1.61 → $47.24** · 2.0 → $45.15 · 2.5 → $43.43 · 3.0 → $42.28 |

**The main risk is member frequency, not price resistance.** Every $1 of the weekly fee is spread over the visits a member takes. Under an unlimited membership, if members average 3 visits per week instead of 1.61, ARPV falls to $42.28 and the whole gain disappears. This is the reason section 6 recommends capped tiers: the cap converts that risk into a contract term. Four protections, in order of importance:

1. **Capped tiers** (Table 4). A member cannot exceed the visits they bought. This alone reduces the revenue spread from 86% to 41% (section 6).
2. **The prime surcharge.** Visits at the busiest times carry $18 each, so heavy use at scarce times is paid use.
3. **A daily limit of one visit per member**, as the Pricing tab already proposes.
4. **Review utilisation quarterly** and set the fee by the frequency we observe rather than the frequency we assume.

The second risk is that private sessions do not reach 12% of visits. At 0% the model still earns $43.45, above target — so the private product improves the outcome but is not load-bearing.

## 9 · Problems in the current sheet

Three items to correct, found while building this model.

1. **The daytime membership costs more than the unlimited membership.** The Assumptions tab lists Unlimited at $45 per week ($195 per month) and Daytime at $55 per week ($238 per month). A restricted product priced above the unrestricted one will not sell. Under this concept, the restricted product is the main product, and the unrestricted one does not exist — prime access is bought per visit.
2. **The membership share does not reconcile**, as noted in the forecast: 67 memberships × 1.61 visits = 108 visits per week, which is 30% of the 356-visit target, not the 40% the sheet assumes. Under the capped tiers, the base case needs **69 memberships at 2.06 visits per week** (section 6). Record frequency as a calculated cell, not a typed one.
3. **The ARPV target of $42.43 is an average of a flat price.** Once prices vary by band, ARPV becomes an output, not an input. The Pricing and Revenue tabs should take the band mix from Table 1 rather than a single rate.

## 10 · What to test before launch

The data tells us where demand sits. It cannot tell us how our own customers will respond to a price they have never seen. Four tests, in order:

1. **Opening period, first 3 months.** Hold the structure but set Prime at $48 rather than $55, and state the date it rises. This buys habit during the ramp without teaching the market that discounts are normal.
2. **Measure utilisation from week one** — the share of entitled visits members actually take (section 6). It is the single number that decides whether the fees are right, and it cannot be read from any competitor’s data. Start with the pre-sale cohort.
3. **Sell private sessions from day one**, even at a small volume, and measure the fill rate against communal sessions in the same band. Sense of Self suggests it is strong in Melbourne.
4. **Review the Quiet price after one winter.** Quiet bands are expected at 28–31% occupancy. If they stay below 25% through the winter peak, the problem is awareness, not price, and the answer is the membership, not a discount.

## 11 · Limits of this analysis

1. **We have no price experiment.** Every venue in the panel holds its price nearly constant, so we can observe how full venues are at different prices, but not what happens when one venue changes its price. Findings about price levels are comparisons between venues, not proof of how our own demand will respond.
2. **The demand shape comes from other venues.** Slow Folk's own pattern may differ, especially in the opening months. Table 1 should be rebuilt from our own bookings after 6 months.
3. **One venue has no price data.** Xtra Clubs publishes no price in its booking data, so it is excluded from the price comparison. Alchemy publishes none either, but its per-location prices are confirmed from its website (Finding 7) and set in our config.
4. **The membership mix (45/15/40), the tier mix and utilisation are assumptions.** The booking platforms do not tell us which visits were paid by a membership, so no competitor data can settle them. Section 6 makes them explicit inputs with a stated method, instead of one unexplained number.
5. **Blue Mountains Sauna is a structural reference only.** It is not in our tracker, so we have its published prices but no occupancy data. Its trade is regional and weekend-led; our bands come from our own venues, not from theirs.
6. **The simulation holds demand constant when price changes.** Given limit 1, this is the honest default: it neither assumes a discount creates demand, nor that a rise destroys it. Treat the revenue figures as the value of the current demand shape under a new price grid, not as a forecast of how customers will react.

---

*Slow Folk pricing concept · created 2026-07-23 from the sauna-session-stats tracker · analysis scripts and per-band data available as JSON on request.*
