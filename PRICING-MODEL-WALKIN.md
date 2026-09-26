# A walk in pricing model, built from the same venue data

**Slow Folk, Neighbourhood Sauna · Pricing concept, walk in comparable**

Data to 2026-09-09 · same fifteen venue panel as PRICING-MODEL-INSIGHTS.md · plus three named reference brands (Akari Sauna, Ice Bath Club, Grotto Baths) and one sourced access control quote

This is a companion document, not a replacement. PRICING-MODEL-INSIGHTS.md is the archive of the well researched booked session model and stays exactly as it is. This document reprices the same demand data under a different access mechanic: no booking, tap in, stay once a day for up to two hours, membership as the primary track and single passes as the secondary one. Where the two documents produce different numbers for the same question, both are shown, because the honest answer right now is that we do not yet know which one Slow Folk will actually run on.

Definitions carried over unchanged: occupancy equals tickets sold divided by seats offered where we have booked data at all. Capacity is 868 visits per week. The Better case is 48 per cent occupancy, 417 visits a week, per 5-YEAR-BENCHMARK-REPORT.md.

## Contents

1. [What changes without a booking, and what does not](#1--what-changes-without-a-booking-and-what-does-not)
2. [Three reference models, side by side](#2--three-reference-models-side-by-side)
3. [Membership as the primary track](#3--membership-as-the-primary-track)
4. [Passes as the secondary track](#4--passes-as-the-secondary-track)
5. [Stay length and floor capacity, not sessions](#5--stay-length-and-floor-capacity-not-sessions)
6. [The founding offer](#6--the-founding-offer)
7. [Access control and staffing: the real numbers](#7--access-control-and-staffing-the-real-numbers)
8. [What this earns, against the booked model](#8--what-this-earns-against-the-booked-model)
9. [What to test before launch](#9--what-to-test-before-launch)
10. [Limits of this analysis](#10--limits-of-this-analysis)

## 1 · What changes without a booking, and what does not

Nothing about when people want to come changes. Every finding in PRICING-MODEL-INSIGHTS.md section 1 describes people, not booking systems, and all of it still holds: price does not predict fill, weekday daytime is a third of our seats running at 42 to 47 per cent while weekday evenings run at 72, Sunday leads at nine of eleven venues we can check, private space beats communal space even where it costs more. None of that depended on anyone having reserved a slot in advance.

What changes is the mechanism for turning that pattern into a price. The booked model prices a named session and charges a surcharge at the moment of booking. Take booking away and there is no moment to charge a surcharge at; a tap on a card either opens the door or it does not. So price differentiation has to move somewhere else: onto the single pass, the way Ice Bath Club prices one rate for a full access day and a lower one for off peak hours, or onto the membership tier itself, where a cheaper tier's card simply does not open the door outside its own hours.

The other thing that changes is what "Prime is 45 per cent of seats" means. In the booked model that is a booking yield statement. Here it becomes a physical room statement, the same one already sitting in the sheet's own Labour tab: keep the sauna at twelve occupants or fewer. Our own demand data still tells you exactly when that ceiling will bind, which is now a staffing and cleaning question rather than a booking one. The Labour tab's own cleaning schedule already reads this way without anyone asking it to: a spot check timed for "low occupancy window in your sheet," a reset timed to "position the venue for 4pm starts." The demand shape survives the pivot; it just moved from pricing engine to rostering tool.

## 2 · Three reference models, side by side

**Table 1.** Mechanics only, not brand positioning, per your instruction.

| | Akari Sauna | Ice Bath Club | Grotto Baths | Slow Folk, proposed |
| --- | --- | --- | --- | --- |
| Booking required | No | No | Once a day, to hold a spot | No, following Akari |
| Stay limit | Not verified this round | Not stated on the pages seen | Unlimited weekdays, 3 hours max weekends | Once a day, up to 2 hours, per your brief |
| Primary product | Membership | Membership, three tiers by time access | Membership, uncapped | Membership, primary track |
| Time differentiation | Not verified this round | Membership tier gates the hours (Anytime, Weekday, Off Peak); single pass has two flat rates | Not gated by tier; managed by the weekend stay cap instead | Tier gates the hours, cap varies by day type as an option |
| Single visit price | Not verified this round | $55 full access, $45 off peak | $55, one rate, no time split shown | Secondary track, two rates |
| Pack ladder | Not verified this round | Steep, 20/50/100 packs down to $26/session, about 53% off | 5 and 10 packs, about 20 to 25% off | Shallower than Ice Bath Club, see section 4 |
| Founding offer | Not shown | Not shown | Waived joining fee, below market locked rate, capped numbers, sold out badge, a second cheaper tier for a named values aligned audience | Same shape, building residents as the audience |

We have Akari's mechanic from our own platform integration work, tap access with live occupancy tracked outside the booking system entirely, but no verified current price list from this session, so its row above is left honest rather than filled in from memory.

## 3 · Membership as the primary track

Unlimited within your tier's hours, not a capped visit count. This is the real structural change from the booked model's ladder, and it is worth being clear eyed about what it trades away: the old design's main protection against a heavy user was the visit cap itself. Remove the cap and the protection has to come from somewhere else, either the tier's own hour restriction, the once a day and two hour rule you set, or both.

**Table 2.** Proposed tiers, following Ice Bath Club's naming and gating logic, priced against our own market rather than theirs. Ice Bath Club is a funded multi city brand; Alchemy and KEEN, both in our own panel, are closer comparables for what an unlimited membership should actually cost here, and both run real unlimited memberships at $27 to $40 a week without their venues running away to daily use.

| Tier | Fee/week | Gate | Note |
| --- | --- | --- | --- |
| **Off Peak** | $45 | Weekday mornings and middays only | The bands running at 33 to 47 per cent occupancy; this tier is aimed squarely at that slack |
| **Weekday** | $65 | Any hour, Monday to Friday | Includes weekday evenings, excludes the weekend |
| **Anytime** | $85 | Every hour, every day | The only tier that includes weekend Prime; priced near Ice Bath Club's own Anytime rate, since it is genuinely the same product |
| **Resident, Off Peak** | $35 | Weekday mornings and middays, proof of residence | The building discount carried over from the booked model, kept out of Prime for the same reason as before |

These four prices are proposed, not measured. We have no walk in venue anywhere in our panel to check them against, which is the single biggest difference in confidence between this document and its companion.

**The frequency question matters more here than it did in the booked model, not less.** The old ladder capped a member at two to four visits a week by contract. These tiers cap nothing except the two hour, once a day rule. Table 5 below shows exactly how much that costs if real usage lands higher than planned. Section 7 explains why this is also the one place a tap access system pays for itself twice over: it turns "we assume 2.1 visits a week" into "we know it was 2.1 visits a week," for free, from the same hardware that opens the door.

## 4 · Passes as the secondary track

Your instruction was explicit: passes and single entry sit second, membership sits first, and the aim is to be able to reduce down to membership only over time. The products below exist to convert a first visit into a member, not to be a parallel business.

**Table 3.** Single entry and packs.

| Product | Price | Note |
| --- | --- | --- |
| Single Entry, Off Peak | $35 | Weekday mornings and middays, roughly the average of the old Quiet and Standard rates |
| Single Entry, Prime | $55 | Unchanged from the booked model's own Prime rate; no reason to move it |
| 5 pack | $220, $44/visit (12% off Prime) | Same discount depth Grotto uses at this size |
| 10 pack | $410, $41/visit | |
| 20 pack | $774, $38.70/visit | |

Twelve per cent per pack, not Ice Bath Club's roughly fifty. Their curve makes sense for a brand selling frequency at scale across many clubs; ours does not yet have the volume to give away that much margin, and the sheet's own stress test shows a twenty per cent swing in a single fee line moves monthly profit by about sixteen hundred dollars. A shallower curve is the more defensible starting point, with room to deepen it once real uptake is measured rather than assumed. Members share the same floor as guest and pass holders, per your brief; nothing here segregates them.

## 5 · Stay length and floor capacity, not sessions

Your own rule is the base case: once a day, up to two hours, no booking. That alone, applied evenly across the week, already caps the theoretical ceiling of any membership at seven visits, fourteen hours, which is the number Table 5's sensitivity range is built around.

**A refinement worth considering, not a replacement for your rule:** Grotto varies the stay cap by day type, unlimited on weekdays, three hours on weekends, because that is exactly where their own scarcity sits. Ours sits in the same place. Table 1 of the companion document shows weekday mornings and middays at 33 to 47 per cent occupancy and weekend afternoons at 52 to 56. A day type variable cap, generous where the room is empty and tighter where it is not, would let the two hour rule do less work on weekdays and more on weekends, matched to where the physical ceiling of twelve occupants is actually likely to bind. This is your call to make, not mine to assume; the two hour flat rule is simpler to explain and to run, and simplicity has its own value here.

## 6 · The founding offer

Every reference brand we looked at, Grotto, and the unnamed Hong Kong brand in the same batch of screenshots, uses the same four part shape: waive the joining fee, price below whatever the eventual public rate will be, cap the number of places hard enough that it can genuinely sell out, and let the sold out badge do the marketing once it does. Grotto adds a second layer worth copying directly: a cheaper tier offered only to one named, values aligned audience, in their case goop's readers.

Slow Folk's own equivalent audience already exists and is a stronger fit than a media readership: the residents of 219 Albion itself. A founding offer built the same way would look like this, as a proposal to confirm rather than a locked number:

- **Waive the setup or joining fee** on any membership tier, for a stated window before opening.
- **A founding rate below the public one**, locked for as long as the membership stays continuously active. A reasonable illustrative depth, following the roughly 20 to 30 per cent the Hong Kong brand's founding tiers show against their own public rate, would put a founding Off Peak membership at about $35/week against a $45 public rate, and a founding Resident membership at about $28/week against $35.
- **A hard cap**, genuinely limited rather than a marketing phrase. Fifty places is a defensible number against 868 visits of weekly capacity; it is large enough to matter and small enough to sell out.
- **The building first.** Offer it to 219 Albion residents ahead of any public opening, exactly as Grotto offered its cheapest tier to goop's readers before anyone else. This is the Resident tier's whole reason for existing, given a real audience and a real reason to move first.

## 7 · Access control and staffing: the real numbers

The quote e2eSecurity issued (QU-SFSH-001, dated 25 June 2026) covers a Kisi system integrated with the building's existing iPassan access control at Nightingale Laak: two controllers, three readers, cabling, configuration, and one monitored electric strike specifically for Shop 101. **Total, GST included: $13,864.47**, plus **$3,285 a year** in Kisi's own platform licence, billed direct rather than through the installer.

Two things worth reading carefully before this becomes a budget line rather than a reference point. **The quote has expired**, its 30 day validity ran out on 25 July 2026; treat every figure here as indicative until a fresh one is issued. **Most of this cost is not uniquely Slow Folk's.** Only one line, the $582.37 electric strike for Shop 101, is exclusively your door. The two controllers, three readers, and the work integrating the building's own gate and amphitheatre entrances are shared Nightingale Laak infrastructure that this quote happens to be addressed to you for. Worth a direct conversation with the building or body corporate about how that line is meant to be split before it lands in Slow Folk's own capital budget at its full value.

Set that against what staffing costs, using the sheet's own Labour tab rather than an assumed figure:

**Table 4.** The sheet's own three staffing scenarios.

| Model | $/month | $/year |
| --- | --- | --- |
| Hybrid, 70/30 | $14,658 | $175,899 |
| Hybrid weekdays, staffed weekends | $17,300 | $207,605 |
| Always staffed | $23,573 | $282,880 |

The gap between Always Staffed and Hybrid 70/30 is **about $107,000 a year**. The full Kisi build, hardware and a year of licence together, costs roughly $17,000. Even if Slow Folk alone were carrying the entire quote, not just its own door, that gap pays for it inside two months. And the Labour tab's own description of the Hybrid model already assumes something close to this: "guests book and check in independently; staff focus on water quality, hygiene touch ups, safety monitoring, and record keeping." That is not a staffing model built for a booking desk. The walk in pivot is consistent with what the sheet already costs, not a departure from it.

The genuine byproduct worth naming: a tap at the door is a timestamp against a member id. That is real utilisation data, the exact number Table 5 below has to guess at otherwise, arriving for free from hardware you would be installing anyway.

**What a lighter staffing model gives up, and what it does not answer.** A keycard does not greet anyone, and Slow Folk's own positioning has been built around a neighbourhood, community first feel from the start. A middle path most of these brands actually run, rather than choosing fully staffed or fully unmanned for the whole week, is to roster a host for the hours the community actually gathers, weekend mornings and any member events, and leave the quiet weekday stretches to the tap. And one thing worth putting to your insurer before anything here is final, because the data cannot answer it: heat, cold immersion and water on a lightly staffed floor carries a different duty of care question than an unstaffed gym does, at twelve occupants in a sauna room with no one rostered nearby.

## 8 · What this earns, against the booked model

Same capacity, same 48 per cent occupancy, same 417 visits a week, same 45/15/40 casual/pack/membership split. Only the price attached to each visit changes.

**Table 5.** The comparison, and the one assumption it rests on.

| | Booked model (PRICING-MODEL-INSIGHTS.md) | Walk in model, this document |
| --- | --- | --- |
| ARPV | $47.15 | $38.20 |
| Annual revenue | $1,022,000 | $828,000 |
| Memberships needed | 91 | 79 |
| What bounds a heavy member | A contracted visit cap, 2 to 4 a week | The 2 hour, once a day rule only |

The gap is real, not a rounding difference, and it is worth being direct about where it comes from. It is not the casual pricing: collapsing three time bands into two for single visits and packs moves ARPV by well under a dollar. It is the membership. The same weighted average fee, about $59 a week, now buys a member an unlimited gate instead of two to four visits, which is structurally a bigger, cheaper to the member product for close to the same money, priced at a planning assumption of 2.1 real visits a week.

**Table 6.** How much that assumption is worth, since it is the whole document's central unknown.

| Real visits/week | Memberships needed | ARPV | Annual revenue |
| --- | --- | --- | --- |
| 1.5 | 111 | $42.69 | $926k |
| **2.1 (planning number)** | **79** | **$38.20** | **$828k** |
| 3.0 | 56 | $34.82 | $755k |
| 4.0 | 42 | $32.86 | $712k |
| 5.0 | 33 | $31.68 | $687k |

Two honest ways to close the gap to the booked model, neither of them free. Raise the membership fees, roughly doubling the weighted average would match the booked model's ARPV exactly, which may simply be pricing an unlimited product correctly rather than a mistake, but it is a real decision, not a rounding fix. Or accept the lower ARPV in exchange for something the booked model cannot offer at all: a genuinely frictionless front door that may pull occupancy above 48 per cent precisely because there is nothing to book. That second argument is the real case for walk in, and it is one this data cannot make for you, because no venue in our panel runs this way. It is a bet on volume the booking model structurally cannot place, priced here at what it costs if the bet does not pay off.

## 9 · What to test before launch

1. **Track real member frequency from day one**, off the Kisi tap log the moment it exists. This single number moves annual revenue by roughly $240,000 across the range in Table 6, more than any other input in this document.
2. **Run the founding offer to the building first**, before any public opening, and treat the take up rate as the first real read on whether $45 a week for Off Peak is priced right.
3. **Watch the weekend stay length**, whichever version of section 5 you choose. If the room is regularly at its twelve occupant ceiling on weekend afternoons within the first few months, that is the signal to move to Grotto's day type cap rather than the flat two hour rule.
4. **Requote the Kisi system** before it enters a capital budget anywhere, and have the building conversation about the shared infrastructure lines first.

## 10 · Limits of this analysis

1. **No venue in our panel runs walk in.** Every occupancy, band, and day of week finding this document borrows from PRICING-MODEL-INSIGHTS.md was measured on booked sessions. It is the right evidence for when people want to come; it is not evidence for how a frictionless door changes how often they come.
2. **The tier prices in Table 2 are proposed, not measured**, for the same reason. Alchemy and KEEN are the closest real anchors we have for an unlimited weekly fee, and neither runs a three tier, time gated structure like the one proposed here.
3. **The 2.1 visits a week planning number is a stated assumption**, built by analogy to the booked model's own measured 2.06 to 2.09 frequency against a much smaller entitlement, not a measurement of this product. Table 6 exists because this number is genuinely unknown.
4. **The Kisi quote is expired and partly shared.** Treat $13,864.47 as indicative, and the true Slow Folk only cost as closer to the $582.37 door strike plus whatever share of the shared infrastructure the building agrees to.
5. **The staffing comparison uses the sheet's own three scenarios as given**, not independently verified against outside market rates for casual and part time wellness staff in Melbourne.
6. **This document does not model elasticity any more than its companion does.** Neither assumes the frictionless door creates demand nor that it does not; Table 5's gap is what the current demand shape is worth under two different pricing mechanisms, not a forecast of which one performs better in the market.

---

*Slow Folk pricing concept, walk in comparable · created 2026-09-12 from the sauna-session-stats tracker, the Ice Bath Club and Grotto Baths reference pricing supplied this session, and e2eSecurity quote QU-SFSH-001 · companion to PRICING-MODEL-INSIGHTS.md and 5-YEAR-BENCHMARK-REPORT.md.*
