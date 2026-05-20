# Catalyst AI — Autonomous Content-to-Action Agent
### #AISeekho 2026 Hackathon | Challenge 1: Autonomous Content-to-Action

> **An AI agent that reads multi-source content, extracts insights, resolves contradictions, validates constraints, executes a 5-step action chain, and recovers from failures — all powered by Google Antigravity (Gemini 2.0 Flash).**

## 🔗 Submission Links

| Item | Link |
|---|---|
| 📱 **Mobile App (APK)** | [Download APK](https://expo.dev/artifacts/eas/eHoy5LJBKy3ktLSWXeAy2D.apk) |
| 💻 **GitHub Repository** | [github.com/hanzalahhanzalah/catalyst-ai-agent](https://github.com/hanzalahhanzalah/catalyst-ai-agent) |
| 🌐 **Live Backend API** | [catalyst-ai-agent-production.up.railway.app](https://catalyst-ai-agent-production.up.railway.app) |
| 📖 **API Docs** | [/docs](https://catalyst-ai-agent-production.up.railway.app/docs) |

---

## 🎥 Demo

| Screen | What It Shows |
|---|---|
| **Sources** | 5 ingested sources with credibility scores, one flagged STALE |
| **Insights** | 6 extracted insights, 2 contradictions auto-resolved |
| **Actions** | 5-step action chain with live animated execution |
| **Outcome** | Before/After state (75% → 18% stockout risk) |
| **Trace** | Every Antigravity reasoning step, exportable as JSON |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CATALYST AI SYSTEM                  │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  React Native │    │    FastAPI Backend        │  │
│  │  (Expo Go)    │◄──►│                          │  │
│  │               │    │  ┌──────────────────┐    │  │
│  │  • Sources    │    │  │ AgentOrchestrator │    │  │
│  │  • Insights   │    │  │ (Gemini 2.0 Flash│    │  │
│  │  • Actions    │    │  │  google.genai)   │    │  │
│  │  • Outcome    │    │  └────────┬─────────┘    │  │
│  │  • Trace      │    │           │               │  │
│  └──────────────┘    │  ┌────────▼─────────┐    │  │
│                       │  │ Intelligence Layer│    │  │
│                       │  │ • Contradiction   │    │  │
│                       │  │ • Constraint      │    │  │
│                       │  │ • Recovery        │    │  │
│                       │  │ • Trace Logger    │    │  │
│                       │  └────────┬─────────┘    │  │
│                       │           │               │  │
│                       │  ┌────────▼─────────┐    │  │
│                       │  │   SQLite DB       │    │  │
│                       │  │ (sessions/traces) │    │  │
│                       │  └──────────────────┘    │  │
│                       └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Agent Flow (10 Steps)
```
INGEST → SCORE → EXTRACT → CONTRADICT → FILTER → TEMPORAL → PLAN → EXECUTE → RECOVER → OUTCOME
```

---

## ✅ Hackathon Requirements Checklist

| Requirement | Status | Implementation |
|---|---|---|
| **Multi-source ingestion** | ✅ | 5 sources: CSV, PDF, JSON, Feed, Web (scored by credibility + recency) |
| **Contradiction detection** | ✅ | Warehouse CSV vs Sales Dashboard — resolved via trust scoring |
| **Constraint-based planning** | ✅ | Budget PKR 500,000 / 48h time limit — Action 3 adjusted |
| **Failure recovery** | ✅ | Action 3 fails → retry → substitute secondary supplier |
| **Outcome visualization** | ✅ | Before/After dashboard: 75% → 18% stockout risk |
| **Google Antigravity integration** | ✅ | Gemini 2.0 Flash (google.genai SDK) with function calling |
| **Agentic reasoning trace** | ✅ | 8+ reasoning steps logged, exportable as JSON |
| **Mobile prototype** | ✅ | React Native Expo — 5 screens, dark glassmorphism UI |

---

## 🧠 Google Antigravity Integration

The agent uses **Gemini 2.0 Flash** via the new `google.genai` SDK for:

1. **Function Calling** — 8 tools defined (`ingest_source`, `extract_insights`, `detect_contradictions`, `filter_noise`, `analyze_temporal_trends`, `generate_action_plan`, `validate_constraints`, `execute_action`)
2. **Agentic Loop** — The orchestrator drives a multi-step reasoning chain where each tool call is logged as a trace entry
3. **Decision Making** — The model reasons about source credibility, contradiction resolution, and recovery strategy
4. **Trace Export** — Every Gemini call, reasoning step, and decision is persisted to SQLite and exportable as JSON

```python
# Real Gemini 2.0 Flash call in orchestrator
from google import genai
client = genai.Client(api_key=GEMINI_API_KEY)
# Agent uses function calling loop for ingestion, analysis, and planning
```

---

## 🎬 Demo Scenario: Industrial Parts Inventory Shortage

**Context**: A Pakistani industrial parts distributor faces a critical stockout crisis.

### 5 Sources Ingested:
| Source | Type | Credibility | Status |
|---|---|---|---|
| Warehouse Management System Export | CSV | 0.65 | ⚠️ STALE (3 days old) |
| Supplier Email (N-55 Blockade) | PDF | 0.88 | ✅ Active |
| Sales Dashboard Live Data | JSON | 0.95 | ✅ Active |
| Customer Complaints Feed | RSS | 0.82 | ✅ Active |
| Supply Chain News Article | Web | 0.75 | ✅ Active |

### Contradiction Detected:
```
Warehouse CSV (May 15):  "Stock Level = SUFFICIENT" ← STALE, trust=0.195
Sales Dashboard (May 18): "Stock Level = CRITICAL"  ← AUTHORITATIVE, trust=0.95
→ Resolution: Sales Dashboard WINS. Warehouse data superseded.
```

### 5-Action Chain Executed:
| # | Action | Cost | Result |
|---|---|---|---|
| 1 | Validate Real Stock Level | PKR 0 | ✅ SUCCESS |
| 2 | Notify Procurement Team | PKR 0 | ✅ SUCCESS |
| 3 | Simulate Emergency Air Freight Order | PKR 485,000 | ❌ FAIL → ♻️ RECOVERED |
| 4 | Update Customer Delivery Estimates | PKR 0 | ✅ SUCCESS |
| 5 | Schedule 24-Hour Monitoring | PKR 2,500 | ✅ SUCCESS |

### Outcome:
```
Stockout Risk:     75% → 18%    (-57%)
Pending Orders:     0  → 300 units
Customers Notified: 0  → 47
Monitoring:        OFF → ACTIVE
Emergency Order:   NO  → YES
Total Cost:        PKR 487,500
Projected Savings: PKR 1,200,000 (7-day)
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Expo Go (Android/iOS)
- Gemini API Key

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
pip install -r requirements.txt
# Create .env file:
echo GEMINI_API_KEY=your_key_here > .env
python main.py
# → Server running on http://0.0.0.0:8000
```

### Mobile Setup
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --lan
# Scan QR with Expo Go (must be on same WiFi as PC)
```

### Environment Variables
```env
GEMINI_API_KEY=AIzaSy...      # Required — Gemini 2.0 Flash
MOCK_MODE=false               # false = real Gemini, true = mock data
PORT=8000
DATABASE_URL=./agent.db
```

> ⚠️ Update `mobile/services/api.ts` BASE_URL to your machine's local IP address.

---

## 📁 Project Structure

```
AISeekho-Agent/
├── backend/
│   ├── main.py                    # FastAPI app + all routes
│   ├── requirements.txt
│   ├── .env                       # GEMINI_API_KEY
│   ├── agent/
│   │   ├── orchestrator.py        # ★ Main Antigravity agent loop
│   │   ├── tools.py               # 8 Gemini function call tools
│   │   ├── contradiction.py       # Cross-source conflict detection
│   │   ├── constraint_engine.py   # Budget/time constraint validation
│   │   ├── recovery.py            # Failure recovery (retry/substitute/rollback)
│   │   └── trace_logger.py        # Antigravity decision trace logger
│   ├── models/
│   │   └── models.py              # Pydantic domain models
│   ├── db/
│   │   └── database.py            # SQLite async schema
│   ├── demo_data/
│   │   └── demo_scenario.py       # 5-source inventory scenario
│   └── ingestors/
│       └── ingestors.py           # PDF/CSV/Web/JSON extractors
└── mobile/
    ├── app/
    │   ├── _layout.tsx            # Root layout + navigation
    │   └── (tabs)/
    │       ├── index.tsx          # Sources screen
    │       ├── insights.tsx       # Insights + Contradictions
    │       ├── actions.tsx        # Action chain + live execution
    │       ├── outcome.tsx        # Before/After outcome dashboard
    │       └── trace.tsx          # Antigravity trace viewer
    ├── store/
    │   └── agentStore.ts          # Zustand global state
    ├── services/
    │   └── api.ts                 # Axios API layer
    └── constants/
        └── theme.ts               # Dark glassmorphism design system
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /health` | GET | Health check |
| `POST /api/demo/load` | POST | Load 5-source demo scenario |
| `POST /api/analyze/{session_id}` | POST | Run full Antigravity analysis |
| `POST /api/execute/{session_id}` | POST | Execute action chain (mobile) |
| `GET /api/outcome/{session_id}` | GET | Get before/after outcome |
| `GET /api/trace/{session_id}` | GET | Get Antigravity reasoning trace |
| `GET /api/trace/export/{session_id}` | GET | Export trace as JSON (for judges) |
| `GET /api/execute/stream/{session_id}` | GET | SSE stream (for web/Postman) |

### Judge Trace Export
```bash
curl http://localhost:8000/api/trace/export/{session_id}
# Returns: agent_trace_XXXXXXXX.json with all reasoning steps
```

---

## 🛠️ Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **AI** | Google Gemini 2.0 Flash (`google.genai`) | Antigravity function calling + reasoning |
| **Backend** | FastAPI + Python 3.12 | Async, fast, OpenAPI docs built-in |
| **Database** | SQLite (aiosqlite) | Zero-dependency, portable for demo |
| **Mobile** | React Native + Expo | Cross-platform, fast QR-scan demo |
| **State** | Zustand | Lightweight, no boilerplate |
| **Data Models** | Pydantic v2 | Type-safe, auto-validated |
| **Streaming** | SSE (sse-starlette) | Real-time action step streaming |

---

## 📊 Judging Criteria Coverage

| Criteria | Weight | Our Implementation |
|---|---|---|
| **Google Antigravity Integration** | 25% | Gemini 2.0 Flash function calling, 8 tools, real reasoning trace |
| **Agentic Reasoning & Workflow** | 20% | 10-step pipeline, contradiction resolution, constraint validation, failure recovery |
| **Technical Implementation** | 20% | FastAPI + React Native, SQLite persistence, SSE streaming |
| **Problem Understanding** | 15% | Real Pakistani business scenario (inventory crisis) with measurable outcomes |
| **Prototype Quality** | 10% | 5-screen mobile app, dark glassmorphism UI, live execution animation |
| **Innovation** | 10% | Multi-source trust scoring, temporal analysis, automated recovery chain |

---

## 🤖 Agent Trace (Sample)

```json
{
  "session_id": "...",
  "total_steps": 8,
  "entries": [
    {
      "step_index": 0,
      "trace_type": "planning",
      "reasoning": "Received 5 sources. Will analyze for insights, detect contradictions...",
      "decision": "Workplan: [1] Ingest → [2] Score → [3] Extract → [4] Contradict → [5] Plan"
    },
    {
      "step_index": 3,
      "trace_type": "tool_call",
      "tool_name": "detect_contradictions",
      "tool_output": {"contradictions_found": 2},
      "decision": "Warehouse CSV is STALE. Sales dashboard is authoritative."
    },
    {
      "step_index": 6,
      "trace_type": "failure",
      "tool_name": "execute_action",
      "decision": "Triggering recovery: retry → substitute secondary supplier"
    },
    {
      "step_index": 7,
      "trace_type": "recovery",
      "tool_name": "handle_failure",
      "decision": "Recovery successful. Substituted Dubai Industrial Hub supplier."
    }
  ]
}
```

---

## 👨‍💻 Built For

**#AISeekho 2026 Google Antigravity Hackathon**
Challenge 1: Autonomous Content-to-Action Agent

*Submission by: [Your Name]*
