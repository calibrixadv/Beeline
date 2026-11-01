# Beeline Route Results Experience: "The Curated Trifecta"

## Problem Statement
> How might we present integrated, multi-modal passenger transport (Train + Metro + Bus) centered on Romania and cross-border European corridors so travelers can evaluate speed, cost, and transfer reliability in under 10 seconds without cognitive fatigue?

---

## Recommended Direction

We recommend **"The Curated Trifecta"** architecture. Rather than confronting travelers with an unranked, overwhelming list of 30+ mixed routes where they have to cross-check timestamps and calculate trade-offs across multiple tabs, the results screen immediately surfaces **three opinionated, high-conviction options pinned at the top**:

1. ⚡ **Fastest Route**: Direct or minimal-stop high-speed / InterRegio rail corridors prioritizing absolute minimum transit duration.
2. 💰 **Best Value / Budget**: Evaluated using the **€10/Hour Saved Threshold** rule:
   - Time saved is valued at **€10 per hour** (~50 RON/hour).
   - If a faster rail connection arrives 1 hour sooner, it **outranks** a bus that is only €10 cheaper.
   - A slower bus/coach leg is recommended only when the financial savings clearly exceed €10 for every additional hour spent in transit.
3. 🛡️ **Most Reliable / Stress-Free**: Dynamic Transfer Risk Allocation:
   - **Romania as the Primary Hub**: Unlike rail networks with sub-minute precision (e.g. Japan), the Romanian railway infrastructure (CFR Călători, private operators like Astra Trans Carpatic / Transferoviar / Softrans) carries a significantly higher delay risk factor due to single-track corridors, maintenance zones, and weather vulnerabilities.
   - Therefore, in Romania and high-risk networks, the "Most Reliable" tier strictly enforces **extended transfer buffers** (minimum 25–35 minutes at critical transfer junctions such as București Nord, Brașov, Cluj-Napoca, or Timișoara Nord).
   - For low-risk networks (e.g., Shinkansen/SBB), transfer buffers are tightened to preserve overall journey speed.

Below the Trifecta, an expandable chronological timeline is provided for travelers who need to depart at specific hours. Each journey card visualizes multi-modal legs with a segmented transit bar:  
`[Ⓜ️ Metrorex M2 12m] ── [🚄 CFR IR 2h 40m] ── [🚌 Regional Bus 30m]`

Tapping any card reveals the stop-by-stop transfer timeline with walking directions, platform numbers, and connection risk tags.

---

## Key Assumptions to Validate

- [ ] **€10/Hour Willingness-to-Pay**: Validate through user testing that travelers in Romania and Central/Eastern Europe align with the ~€10 (~50 RON) / hour time-value trade-off.
- [ ] **10-Second Decision Speed**: Validate that presenting 3 distinct winner cards reduces time-to-selection by at least 60% compared to traditional infinite lists.
- [ ] **Transfer Risk Rating Acceptance**: Validate that flagging a 12-minute connection at București Nord as "High Risk / Tight Buffer" helps travelers avoid missed connections and increases trust in Beeline.
- [ ] **Single vs. Multi-Ticket Clarity**: Validate that clear badges indicating "1 Unified Ticket" vs. "2 Separate Tickets Required" prevent checkout confusion between CFR rail and regional buses.

---

## MVP Scope

- **Top Curated Trifecta Row**: 3 responsive, interactive cards with distinct visual indicators (Fastest, Best Value, Most Reliable).
- **Time-Value Scoring Engine**: Evaluates Fastest vs. Budget routes applying the €10/hour rule.
- **Dynamic Connection Risk Engine**: Adjusts transfer buffers based on country risk factor (Romania = generous buffer, low-risk = tighter buffer).
- **Segmented Transit Leg Bar**: Horizontal multi-modal visualizer for every journey displaying mode icon (Train, Metro, Bus), duration, and transfer nodes.
- **Interactive Stopover & Platform Modal**: Tapping any card opens a detailed itinerary sheet with walking times, station transfer instructions, and platform numbers.
- **Basic Filter Controls**: Quick toggle between "All Modes", "Trains Only", and "Buses Included", plus sorting by Departure Time.
- **Eco CO₂ Savings Indicator**: Quantified emissions reduction vs. commercial flights or personal car travel.

---

## Not Doing (and Why)

- **Live Interactive Map on Results List**: Excluded to prevent mobile frame drops, excessive battery consumption, and visual clutter. Map view belongs on a dedicated full-screen navigation modal or subsequent tracking screen.
- **In-App Seat Picker for Multiple Operators**: Booking APIs for European rail/bus operators have incompatible seat mapping protocols; MVP redirects to operator checkout or deep-links.
- **Live GPS Vehicle Movement on Intermediate Busses**: High API latency and sporadic telemetry make live GPS dots unreliable for long-distance routes. We rely on scheduled vs. estimated timestamps.
- **Multi-Day Split Hotel Packages**: Out of scope for pure transit routing; focuses strictly on transit connections.

---

## Resolved Clarifications & Constraints

- **Time vs. Money Trade-off**: Fixed at €10 / hour saved (~50 RON/hr). A train arriving 1 hour earlier takes precedence over a bus that is only €10 cheaper.
- **Transfer Buffer Weighting**: "Most Reliable" adapts to the regional infrastructure risk profile: generous buffers for Romania (25-35+ min), compact buffers for high-accuracy networks.
- **Primary Geographic Focus**: Romania is established as the core operational launch market, integrating CFR Călători, private operators, Metrorex, and intercity buses, connecting to cross-border European gateways.
