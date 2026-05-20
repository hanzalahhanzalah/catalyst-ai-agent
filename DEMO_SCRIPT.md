# 🎬 Demo Video Script — Catalyst AI
### #AISeekho 2026 | Challenge 1: Autonomous Content-to-Action

**Target Length**: 4-5 minutes  
**Format**: Screen recording of phone + narration

---

## 🎙️ INTRO [0:00 – 0:30]

> *Show the home screen of the app*

**Say:**
> "This is Catalyst AI — an autonomous content-to-action agent built on Google Antigravity.
>
> The system reads content from multiple sources, extracts actionable insights, detects contradictions between data sources, validates against real-world constraints, executes a 5-step action chain, and recovers automatically from failures.
>
> I'll show you a live demo of the complete pipeline."

---

## 📥 SOURCES SCREEN [0:30 – 1:15]

> *Tap "Load 5-Source Demo Scenario"*

**Say:**
> "The agent ingests 5 real-world sources for an industrial parts distributor in Pakistan facing a stockout crisis."
>
> *Point to each card:*
> - "Warehouse CSV — flagged as STALE, 3 days old, credibility 0.65"
> - "Supplier email PDF — confirming N-55 Motorway blockade, trust 0.88"
> - "Sales dashboard JSON — live data, highest trust at 0.95"
> - "Customer complaints feed — +400% spike, trust 0.82"
> - "Supply chain news article — corroborates the supplier delay"
>
> "Each source gets a credibility and recency score. The Antigravity agent uses these to resolve conflicts."

> *Tap "Run Agent Analysis"*

---

## 💡 INSIGHTS SCREEN [1:15 – 2:15]

> *Show insights appearing*

**Say:**
> "Gemini 2.0 Flash has extracted 6 insights from these sources."
>
> *Scroll to the purple contradiction card:*
> "Here's where Antigravity's reasoning shines. Two sources directly contradict each other."
>
> *Tap the contradiction card:*
> "The warehouse CSV says 'SUFFICIENT stock'. The live sales dashboard says 'CRITICAL shortage'. The agent reasons: the CSV is 3 days stale with a combined trust score of 0.195 versus the dashboard's 0.95. The dashboard wins. Contradiction resolved."
>
> "This is not just a data merge — it's a decision with a reasoning trace."
>
> *Point to confidence bars:*
> "Each insight has a confidence score and impact level. 3 are marked CRITICAL."

---

## ⚡ ACTIONS SCREEN [2:15 – 3:30]

> *Show the 5 action cards*

**Say:**
> "Based on those insights, the agent generated a 5-step action chain — validated against a PKR 500,000 budget constraint and 48-hour time limit."
>
> "Action 3 — the emergency air freight order — was initially estimated at PKR 620,000. The constraint engine automatically adjusted it to a partial batch of 300 units at PKR 485,000. That's constraint-based planning in action."

> *Tap "Simulate Execution"*

**Say:**
> "Watch the execution log at the bottom..."
>
> *Wait for Action 3 to fail (red line appears):*
> "Action 3 just failed — supplier API timeout after 30 seconds. The agent doesn't stop."
>
> *Wait for recovery (purple line):*
> "It triggers the recovery engine: retry with exponential backoff... then substitutes with a secondary supplier from Dubai Industrial Hub."
>
> *Wait for chain complete:*
> "Chain complete. Total cost: PKR 487,500. One failure, one recovery. The system is resilient."

---

## 📊 OUTCOME SCREEN [3:30 – 4:15]

> *Navigate to Outcome tab*

**Say:**
> "This is the outcome dashboard. Before vs after state comparison."
>
> *Point to the hero metric:*
> "Stockout risk dropped from **75% to 18%** — a 57 percentage point reduction."
>
> *Scroll through metrics:*
> - "300 emergency units ordered"
> - "47 customers proactively notified about delivery delays"
> - "24-hour monitoring activated — the agent will alert if risk rises above 30%"
>
> *Point to projected impact:*
> "Projected 7-day savings from preventing the stockout: **PKR 1.2 million**. ROI on the air freight cost: **+147%**."

---

## 🔍 TRACE SCREEN [4:15 – 4:45]

> *Navigate to Trace tab*

**Say:**
> "Every single decision the Antigravity agent made is logged here — this is the full reasoning trace."
>
> *Tap a PLANNING card:*
> "The workplan reasoning step."
>
> *Tap a TOOL_CALL card:*
> "The contradiction detection tool call — inputs, outputs, and the decision."
>
> *Tap a FAILURE card:*
> "The failure and recovery chain — judges can audit every step."
>
> "This trace is fully exportable as JSON via the API for your review."

---

## 🏁 CLOSING [4:45 – 5:00]

**Say:**
> "Catalyst AI demonstrates a complete agentic workflow: multi-source ingestion, insight extraction, contradiction resolution, constraint-based planning, live execution with failure recovery, and measurable outcomes — all powered by Google Antigravity.
>
> Thank you."

---

## 📹 Recording Tips

- **Record in landscape** for the log screen, portrait for others
- **Use screen record + internal mic** — keep background quiet
- **Slow down** on contradiction cards and failure/recovery moments — those are the judge WOW moments
- **Show the log animating** in real time — don't cut during execution
- **Zoom in** on the 75% → 18% number — it's your strongest metric

---

## 🗂️ What to Submit

- [ ] Demo video (MP4, max 5 min)
- [ ] GitHub repo link (this repo)
- [ ] Agent trace JSON export (run: `GET /api/trace/export/{session_id}`)
- [ ] README.md (already in repo root)
- [ ] APK or Expo Go QR code for judges to test
