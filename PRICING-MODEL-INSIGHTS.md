# A pricing model built from venue data

**Slow Folk, Neighbourhood Sauna · Pricing concept**

Data to 2026-09-09 · fifteen tracked venues · 289,642 recorded sessions · Melbourne, Adelaide, Perth, Sydney, Blue Mountains, Byron Bay, Zurich

This document designs a pricing model from the booking data we collect, and from nothing else. No market study, no assumed price sensitivity. Every rule below answers to a number we measured. It is a concept for review, not a final price list. Companion document: 5-YEAR-BENCHMARK-REPORT.md.

Definitions used throughout: occupancy equals tickets sold divided by seats offered. ARPV is average revenue per visit. Capacity is 868 visits per week. Prime, Standard and Quiet are the three time bands defined in section 3. Scenario names follow the benchmark report: Good, Better, Best.

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

**Finding 1. A lower price still does not fill a venue.** Across seven Australian venues with a single confirmed price, the relationship between ticket price and occupancy is +0.15, effectively none. The cheapest venue in the panel (Sol, $30/$35) is close to the emptiest. The most expensive Melbourne venue (Sense of Self, $68) is close to the fullest.

| Venue | Price | Occupancy |
| --- | --- | --- |
| Sense of Self (Melbourne) | $68 | 94.1% |
| Inner Studio (Melbourne) | $47 | 75.6% |
| Sauna Goose (Melbourne) | $30 / $35 | 71.2% |
| Aalto (Adelaide) | $35 | 67.2% |
| EQ (Melbourne) | $95 to $107 | 49.3% |
| Sol Sauna (Melbourne) | $30 / $35 | 39.4% |
| The Corner Sauna (Apollo Bay) | $40 | 37.8% |

Prices and occupancy are both current at 2026-09-09. The conclusion has not changed since the July version of this document: in the observed range of $30 to $107, price is not what decides whether a venue fills. Product, location and reputation decide it. A price war is still the wrong strategy.

**Finding 2. Demand is still very uneven across the week, and our seats are still in the wrong places.** Pooled across the same Australian venues:

| Band | Occupancy | Share of visits | Share of seats |
| --- | --- | --- | --- |
| Weekday shoulder (15 to 17) | 72.1% | 12.0% | 9.5% |
| Weekday evening (17:00 onward) | 72.1% | 19.5% | 15.5% |
| Weekend late (15:00 onward) | 71.2% | 11.0% | 8.8% |
| Weekend midday (10 to 15) | 65.9% | 11.9% | 10.3% |
| Weekend early (before 10) | 56.8% | 9.8% | 9.8% |
| Weekday midday (9 to 15) | 46.7% | 21.1% | 25.7% |
| Weekday early (before 9) | 41.5% | 14.8% | 20.3% |

Weekday daytime still holds 46 per cent of all seats and still runs at 42 to 47 per cent occupancy. Weekday evening and shoulder together hold a quarter of seats and run at 72 per cent. Same story as July, same gap.

**Finding 3. Sunday is still the strongest day almost everywhere, but Thursday's hold on last place has loosened.** Sunday leads at nine of eleven venues checked this round, the same wide margin as before: Inner Studio 95.9 per cent on Sunday, Aalto 90.2, Sauna Goose 92, Alchemy 72.4. The two exceptions are Sense of Self, whose peak day is Monday, and The Corner Sauna, whose peak day is Tuesday. On the weak end, Thursday is now the softest weekday at five of eleven venues, with Tuesday close behind at four. In July this document said Thursday was weakest at seven of eleven; on fresh data that lead has narrowed to a coin flip between Thursday and Tuesday. Sunday still behaves like a peak, not part of a flat weekend price. The Thursday pair offer in section 5 still targets a genuinely weak day, just not as uniquely weak as first thought.

**Finding 4. Small and private sessions still fill better than communal sessions, mostly at the same price or higher.**

| Venue | Private (1 to 4 seats) | Best communal band | Note |
| --- | --- | --- | --- |
| Sol Sauna | 100% | 40.9% (9 to 14 seats) | same price, tiny private volume |
| Aalto | 84.0% | 78.7% (5 to 8 seats) | same price |
| Inner Studio | 83.8% | 75.1% (9 to 14 seats) | private is slightly cheaper here, not more expensive |
| EQ | 73.7% at $82 | 42.4% at $124 (5 to 8 seats) | the one exception: EQ's communal band costs more than its private band, and still fills worse |

The pattern holds at four of the venues we can check it against, including the one genuine exception, where EQ's communal room is priced above its private room and still underperforms it. Private capacity remains the highest yield product we can see in the data.

**Finding 5. Sol Sauna's two tier price has now run for four months, not two.** Sol split its flat $30 into Off Peak ($30) and Peak ($35) in June 2026. As of this refresh it is still running both prices, with a close to even mix in recent months (October and November bookings running about 47 per cent Off Peak, 53 per cent Peak). This is no longer a two month experiment; it has become how Sol prices itself.

**Finding 6. Blue Mountains Sauna is now genuinely in our tracker, and it confirms the published price exactly, but it still cannot tell us anything about fill.** In July this venue was a published price list only, not a tracked feed. We now capture its real booking schedule through Punchpass, including capacity for 91 of its distinct session types, worked out by probing far future dates the way a capacity oracle does. Its 1,570 past sessions we hold confirm the exact price split already used in this document: $45 off peak on 1,220 sessions, $55 peak on 350. Punchpass, however, never once returns a genuine ticket count on any session we have captured, past or future. This is a limit of the platform, not of our fetch: the badge that shows remaining spots disappears the moment a session starts, and whatever mechanism would let a poller catch that number before it vanishes is not something we have built or verified works here. Blue Mountains Sauna therefore stays schedule and price evidence only, exactly as flagged in July, just on a firmer footing now that the schedule itself is real and not read off a website.

**Finding 7. Inside Alchemy, the gap between the cheaper sites and the dearer ones has closed.** In July, Alchemy's four beach and river sites (all $20) ran nine points fuller than its four premium sites (all $35), which read as a clean example of Finding 1. On fresh data, with a ninth site (Karrinyup) now old enough to weigh in, the two groups have converged to within half a point of each other: premium 56.5 per cent, beach 56.9 per cent.

| Alchemy site | Group | Occupancy |
| --- | --- | --- |
| Port Beach | Beach ($20) | 65.4% |
| East Fremantle | Premium ($35) | 62.0% |
| West Leederville | Premium ($35) | 59.9% |
| City Beach | Beach ($20) | 58.4% |
| Point Walter | Beach ($20) | 58.2% |
| Scarborough | Premium ($35) | 51.0% |
| Fremantle | Beach ($20) | 50.1% |
| Karrinyup | Premium ($35) | 40.9% |

This is a better version of Finding 1 than the group average was, not a weaker one. The best beach site (Port Beach) beats every premium site. The best premium site (East Fremantle) beats three of the four beach sites. Individual site performance now visibly overwhelms the two tier price grouping, inside one brand, at the same two prices, run by the same operator. Price is not the variable that explains the spread; something about each site's own location and standing is.

A gap in our own coverage, found while checking this: Alchemy's own materials list a ninth Perth location, East Perth, alongside the eight we track. We do not have a booking widget id for it. Worth chasing if a fuller Alchemy picture matters later.

**Finding 8. The fastest growing operator in the category is still built on exactly the lever this model proposes, and its own data has not moved since July.** Xtra Clubs' published structure, rationing peak access by membership tier while leaving off peak unlimited on every tier, is unchanged and still worth the comparison drawn in the July version of this document. What has changed is that Xtra's own booking data is now six months stale rather than newly refreshed: an attempt to pull fresh data for this report returned a 404 from their API, which the July refresh did not encounter. Bondi Junction's own occupancy figure in this report (56.2 per cent mature, Table 4b of the benchmark report) is therefore March data, not September. The structural argument stands; the number behind it is older than everything else in this document.

**Finding 9. Navia Bathhouse, new this round, is the first real occupancy reading we have on a genuinely premium price point, and it is not yet a strong one.** Navia opened its Byron Bay site in August 2026: sixteen seats to a sitting, $80 for two hours, a bespoke booking system we worked out how to read properly only recently. One month of real trading gives 16.2 per cent occupancy across 433 past sessions. That is a soft start for a new venue at any price, and at one month old it says more about awareness than about whether $80 works. It is included here because it is genuinely new evidence, not because it proves anything yet. Worth another look after it has had a full season.

## 2 · Design principles

These follow from the nine findings above.

1. **Price the time, not the customer.** The same sauna hour has very different value on a Tuesday morning and a Thursday evening. The price should say so.
2. **Do not discount to fill; give access instead.** Because price does not drive fill (Finding 1), a discount at a quiet time gains little. A membership that includes quiet times converts empty seats into recurring revenue without lowering the casual price.
3. **Protect prime capacity.** Prime seats are scarce (Finding 2). They should carry the highest price and should not be given away inside an unlimited membership.
4. **Sell privacy as a product.** Private sessions fill better and mostly carry a premium (Finding 4), and even where they do not, they still outperform the room that costs more (Finding 4's EQ exception).
5. **Sell the building.** Slow Folk sits inside a residential community. Residents are the only customers who can fill a Tuesday morning without crossing a suburb, so the model gives them access to exactly the seats that are otherwise empty (section 5).
6. **Cap what you sell.** A membership should state the number of visits it includes. Frequency then becomes a term of the product rather than a risk in the forecast (section 6).
7. **Keep the structure small.** Three time bands and four core products. A member should understand the rule in one sentence.

## 3 · The time bands

Slow Folk opens 06:30 to 23:00, seven days: 116 hours and 868 visits per week (Venue Capacity tab). The bands below apply the fresh measured demand shape to that grid, at the revised Better occupancy of 48 per cent.

**Table 1.** The band structure, with expected visits at 48 per cent occupancy.

| Band | Hours | Seats/week | Expected visits | Occupancy | Tier |
| --- | --- | --- | --- | --- | --- |
| Weekday early | 6:30 to 9:00, Mon to Fri | 94 | 31 | 32.9% | Quiet |
| Weekday midday | 9:00 to 15:00, Mon to Fri | 225 | 83 | 37.0% | Quiet |
| Weekday shoulder | 15:00 to 17:00, Mon to Fri | 75 | 43 | 57.1% | Standard |
| Weekday evening | 17:00 to 23:00, Mon to Fri | 225 | 129 | 57.1% | **Prime** |
| Weekend early | 6:30 to 10:00, Sat to Sun | 53 | 24 | 45.0% | Standard |
| Weekend midday | 10:00 to 15:00, Sat to Sun | 75 | 39 | 52.2% | **Prime** |
| Weekend late | 15:00 to 23:00, Sat to Sun | 120 | 68 | 56.4% | **Prime** |

Prime is 45 per cent of seats and takes 45 per cent of visits at this occupancy level, a tighter gap than the July grid, because the higher target occupancy fills more of the quiet bands too. The Quiet bands are still the opportunity: 46 per cent of seats running at 33 to 37 per cent.

## 4 · The products and prices

**Table 2.** Casual price by tier, unchanged from July.

| Tier | When | Price |
| --- | --- | --- |
| Quiet | Weekdays before 15:00 | **$32** |
| Standard | Weekdays 15:00 to 17:00; weekends before 10:00 | **$44** |
| Prime | Weekday evenings; all weekend from 10:00 | **$55** |

Anchors from our own data, refreshed: Sol $30/$35 (39.4 per cent full), Aalto $35 (67.2 per cent), Inner Studio $47 (75.6 per cent), Sense of Self $68 (94.1 per cent). Against Inner Studio's single $47 rate, our Quiet price is 32 per cent lower and our Prime price is 17 per cent higher, the same relative positioning as July: cheaper than the market leader for most of the week, dearer only when seats are scarce.

**Table 3.** The five products. Membership was six tiers; it is now three, with the low commitment end moved into a new 4 pack instead (section 4a).

| Product | Price | What it includes | Why |
| --- | --- | --- | --- |
| **Casual visit** | $32 / $44 / $55 by tier | One visit | Prices scarcity (Finding 2) |
| **4 pack** | 8% below the tier price ($29 / $40 / $51 per visit) | Four visits, valid 3 months, transferable | Low commitment entry point; replaces the old Early and Two membership tiers |
| **10 pack** | 15% below the tier price ($27 / $37 / $47 per visit) | Ten visits, valid 12 months, transferable | Rewards commitment; transferability serves the building (section 5) |
| **Membership** | Three tiers, $52 to $88 a week (Table 4) | A set number of visits per week in Quiet and Standard. Prime costs +$18 each | Sells the half empty Quiet bands (Finding 2), protects Prime, and makes frequency a contract term instead of a risk (section 6) |
| **Private session** | $75 per person, minimum 2 | Whole room, up to 6 people | Highest yield product in the data (Finding 4) |

**Table 4.** The membership ladder, compressed from six tiers to three. Early, Two and Four are gone; that demand now sits in the 4 pack (Table 3) instead of a membership. "Break even" is the number of visits per week at which the membership beats buying a 10 pack. "Max available" is the ceiling each tier could reach alone, using every seat in Quiet and Standard not already needed by casual visits, packs and private sessions at the Better case, a shared pool of 305 visits a week (section 6).

| Tier | Fee/week | Visits included | People | Effective $/visit | Break even | Max available |
| --- | --- | --- | --- | --- | --- | --- |
| **Membership** | **$62** | **3, Quiet + Standard** | 1 | $28.70 | 2.00 | ~100 |
| **Household** | **$88** | **4, shared between 2 people** | 2 | $30.56 | 2.84 | ~75 households |
| **Resident** | **$52** | **3, residents of the building** | 1 | $24.07 | 1.76 | **80, capped** |

Membership now absorbs what were the Two, Three and Four tiers into one product; the fee is Three's old fee, kept because it sat at the best effective rate of the three. Effective $/visit assumes members use 72 per cent of their entitlement (section 6). The "max available" figures are each tier's ceiling taken alone, not additive: all three draw on the same 305 visits, so growing one leaves less room for the other two. Resident's 80 is a policy cap, not a capacity one, set below its roughly 100 visit ceiling on the assumption it should track the building's own household count rather than the venue's physical limit. The building's actual household count is not yet in this document; 80 is a planning ceiling until it is.

Two supporting rules, unchanged: a $35 guest pass for Quiet and Standard bands, and a $20 no show fee for a booking cancelled inside 12 hours.

## 5 · The neighbourhood layer

Unchanged from July. Slow Folk sits on level 1 of a multi residential building with an established community, and the pricing should use that structural advantage no venue in our panel has.

| Product | Price | Rule |
| --- | --- | --- |
| **Resident membership** | $52/week | 3 visits per week, Quiet and Standard. Proof of residence in the building. Prime at +$18 as normal. Capped at 80 memberships (Table 4). |
| **Household membership** | $88/week | 4 visits per week shared between two people at one address. Either person may use any visit. |
| **Transferable 10 pack** | $27 to $47/visit by band | Valid 12 months. Any holder may use it, and may bring the people they are with. |
| **Neighbour hours** | Included in resident and household tiers | Two named Quiet sessions each week reserved for building residents until 24 hours before, then released to everyone. |
| **Pair rate, Thursday** | $55 for two people, Quiet or Standard | Thursday is a genuinely weak day, though now tied with Tuesday rather than uniquely so (Finding 3). Still the right day for this offer, since Tuesday's own weakness is concentrated at different venues than ours. |

## 6 · Member visits per week: how to calculate it

The method from July stands unchanged. What has changed is the target it feeds.

**The recommended method, unchanged.** Cap each tier, estimate one number (utilisation, the share of entitled visits a member actually takes), weight across the tier mix, and check every tier against its break even. This makes frequency a product parameter, not a behavioural guess.

**Table 5.** The result, using the three tier mix above, at the 48 per cent occupancy target. At 48 per cent, mature weekly visits are 417 (868 times 48 per cent). Moving the old Early and Two tiers into the 4 pack shifted the membership share of visits from 40 to 34 per cent; net of the 12 per cent that goes to private sessions, that is 125 member visits a week to fill, against 167 under the six tier design.

| Utilisation | Member frequency | Average fee | Memberships needed (125 member visits/week) |
| --- | --- | --- | --- |
| 60% (cautious) | 1.91 visits/week | $64.82 | 65 |
| **72% (planning number)** | **2.29 visits/week** | **$64.82** | **55** |
| 85% (heavy use) | 2.70 visits/week | $64.82 | 46 |

Frequency rose from 2.06 to 2.29 visits a week because compressing six tiers to three removed the low cap Early and Two tiers from the weighted average; fewer, more committed members instead of many light ones. Average fee rose from $56.96 to $64.82 for the same reason: Membership, Household and Resident are all fee tiers of $52 and up, with nothing left at $34 to pull the average down. **Use 55 memberships at 2.29 visits per week as the planning numbers**, split roughly 35 Membership, 10 Household and 10 Resident at the tier mix above; well inside Resident's 80 cap. Record all of this as calculated cells, with the tier mix and utilisation as their inputs, and measure real utilisation from the pre sale cohort onward.

**Table 4's "max available" column, worked out.** Quiet and Standard together hold 447 seats a week; at the same 95 per cent ceiling used everywhere else in this document, that is 424 usable visits. Casual visits, packs and private sessions already claim about 119 of those at the Better case, leaving 305 visits a week that membership growth could draw on. Dividing that 305 by each tier's own visit cap, taken alone, gives the ceilings in Table 4: about 100 for Membership, about 75 households for Household. They are not additive, since all three tiers are drawing on the same 305, and Prime is not counted here at all, since members reach it only by paying the surcharge rather than by any reserved room.

## 7 · What the model earns

The simulation applies the fresh measured demand shape (section 3) to Slow Folk's weekly grid, splits visits by product mix (45 per cent casual, 21 per cent pack, 34 per cent membership, the pack share raised by the move to three membership tiers), and prices each visit by its band.

**Table 6.** How the design decisions move ARPV, at 48 per cent occupancy. The target from the Ramp Scenarios tab is $42.43.

| Structure | ARPV | Annual revenue at 48% |
| --- | --- | --- |
| Flat price everywhere (current model) | $41.59 | $901k |
| Time bands only, no private sessions, old surcharge | $41.00 | $888k |
| **Recommended (bands, private sessions, $18 surcharge, three tier membership + 4 pack)** | **$46.73** | **$1,012k** |

**Table 7.** The recommended structure across Good, Better and Best.

| Scenario | Visits per week | ARPV | Annual revenue | Memberships |
| --- | --- | --- | --- | --- |
| Good (34% occupancy) | 295 | $46.73 | $717k | 39 |
| **Better (48% occupancy)** | **417** | **$46.73** | **$1,012k** | **55** |
| Best (65% occupancy) | 564 | $46.73 | $1,371k | 74 |

ARPV itself does not move with the occupancy scenario, since it is a property of the price grid and the mix, not of how full the venue runs. Annual revenue and membership count scale with occupancy directly, and even at Best, Resident sits at roughly 13 memberships, well under its 80 cap. At the Better case, ARPV is $46.73 against the $42.43 target, a smaller margin than the six tier design's $47.15 but still $4 of headroom, on a membership base that is simpler to sell and easier to service.

## 8 · Sensitivity and risk

**Table 8.** ARPV under the three tier structure, one variable at a time. None of these relationships depend on the occupancy scenario.

| Variable | Values and resulting ARPV |
| --- | --- |
| Average member fee per week | $52 → $45.03 · $58 → $45.88 · **$65 → $46.73** · $71 → $47.58 · $78 → $48.43 |
| Prime casual price | $45 → $43.57 · $50 → $45.15 · **$55 → $46.73** · $58 → $47.68 · $62 → $48.94 |
| Private share of visits | 0% → $42.87 · 8% → $45.44 · **12% → $46.73** · 18% → $48.66 · 25% → $50.91 |
| Member visits per week | 1.61 → $50.30 · 2.0 → $47.95 · **2.29 → $46.73** · 2.5 → $46.01 · 3.0 → $44.71 |

The main risk is still member frequency, not price resistance, and the protections are unchanged: capped tiers, the $18 prime surcharge, a daily visit limit, and a review of the fee against measured utilisation rather than the assumed one.

## 9 · Problems in the current sheet

Three items, one of them updated this round.

1. **The daytime membership still costs more than the unlimited membership.** Unchanged since July: the Assumptions tab lists Unlimited at $45/week and Daytime at $55/week. Under this concept, the restricted product is the main product and the unrestricted one does not exist; prime access is bought per visit instead.
2. **The membership count does not reconcile, and the target has moved again.** In July this was 67 in the sheet against 88 needed; after the first September revision it was 67 against 81. Compressing to three tiers moves the target again, to **55 needed** (section 6) against the sheet's 67, so the sheet is now overshooting the target rather than undershooting it, the opposite direction from every prior version.
3. **ARPV is now genuinely an output, not an input, and the target itself may need revisiting.** The sheet's $42.43 was built as a single flat rate; this model's $46.73 comes from the band mix in Table 1 and the three tier ladder. Both the Pricing and Revenue tabs should take their volume split from the band structure, not a single rate, and the $42.43 target itself is worth checking against the revised $46.73 once the Better case above is accepted.

## 10 · What to test before launch

Unchanged from July, still the right four tests in the same order: open Prime at $48 for the first three months with a published rise date, measure member frequency from week one against the pre sale cohort, sell private sessions from day one and compare their fill to communal sessions in the same band, and review the Quiet price after one winter if it has not moved off its low 30s.

## 11 · Limits of this analysis

1. **We still have no price experiment.** Every venue in the panel holds its price close to constant; Sol Sauna's mid 2026 split is the only real change we have observed anywhere in the panel, and it has now run long enough (four months) to treat as a genuine data point rather than a blip, though it is still one venue.
2. **The demand shape still comes from other venues**, and should be rebuilt from Slow Folk's own bookings after six months of trading.
3. **Two prices are still external, not app captured**: Alchemy's from its own website, Xtra Clubs' from a published operator brief, both labelled as such and kept out of the computed correlation in Finding 1.
4. **The tier mix and utilisation in section 6 are still assumptions**, not measurements, for the same reason as July: no booking platform tells us which visit was paid for by a membership.
5. **Blue Mountains Sauna and Navia Bathhouse are both new to this document and both thin.** BM Sauna will likely never carry an occupancy reading, for the platform reason given in Finding 6, not a fixable data problem. Navia's one month of trading (Finding 9) should not be read as evidence either way about a premium price point; it is one early number, disclosed because it is real, not because it is conclusive.
6. **Xtra Clubs' own data is now the single most out of date figure feeding this document.** Every reference to Bondi Junction, in both this report and the benchmark report, rests on March 2026 data because a fresh pull failed with a 404 this round. Treat Finding 8's structural argument as current and its number as six months old.
7. **The simulation still holds demand constant when price changes**, for the same honest reason as July: with no elasticity evidence, the responsible default is neither assuming a discount creates demand nor that a rise destroys it.

---

*Slow Folk pricing concept · created 2026-09-09 from the sauna-session-stats tracker · analysis scripts and per band data available as JSON on request.*
