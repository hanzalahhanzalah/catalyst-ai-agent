"""
Catalyst AI — FastAPI Backend
Real user uploads → Real Gemini analysis → Real insights & actions
"""
import os
import uuid
import json
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Optional, List

from dotenv import load_dotenv
load_dotenv()

# ── Startup validation ────────────────────────────────────────────────────────
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if not _GEMINI_KEY or _GEMINI_KEY == "your_gemini_api_key_here":
    raise RuntimeError(
        "\n\n[Catalyst AI] GEMINI_API_KEY is missing!\n"
        "Create backend/.env with: GEMINI_API_KEY=your_key_here\n"
        "Get a key at: https://aistudio.google.com/apikey\n"
    )

from db.database import init_db, get_db
from models.models import ConstraintProfile, SystemState
from agent.orchestrator import AgentOrchestrator

_sessions: dict[str, AgentOrchestrator] = {}


def _now():
    return datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("[Catalyst AI] Server ready.")
    yield


app = FastAPI(
    title="Catalyst AI — Autonomous Content-to-Action Agent",
    description="Real Gemini 2.0 Flash powered analysis of user-uploaded content",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": _now(), "version": "2.0.0"}


# ─── Session Management ───────────────────────────────────────────────────────

@app.post("/api/session/new")
async def new_session():
    """Create a new analysis session."""
    session_id = str(uuid.uuid4())
    orchestrator = AgentOrchestrator(session_id)
    _sessions[session_id] = orchestrator

    db = await get_db()
    await db.execute(
        "INSERT INTO sessions (id, name, status, system_state, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        (session_id, "New Session", "ready", json.dumps(SystemState().model_dump()), _now(), _now())
    )
    await db.commit()
    await db.close()

    return {"session_id": session_id, "message": "Session created. Add sources to begin."}


# ─── Source Upload Endpoints ──────────────────────────────────────────────────

class TextSourceRequest(BaseModel):
    session_id: str
    name: str
    content: str
    source_type: str = "text"  # text, email, report, csv_data, notes


class URLSourceRequest(BaseModel):
    session_id: str
    url: str
    name: Optional[str] = None


@app.post("/api/sources/add-text")
async def add_text_source(req: TextSourceRequest):
    """Add a text source (paste any text, report, email, data)."""
    orchestrator = _sessions.get(req.session_id)
    if not orchestrator:
        orchestrator = AgentOrchestrator(req.session_id)
        _sessions[req.session_id] = orchestrator

    source = {
        "id": f"src-{uuid.uuid4().hex[:8]}",
        "type": req.source_type,
        "name": req.name,
        "content": req.content,
        "credibility_score": 0.85,
        "recency_score": 1.0,
        "timestamp": _now(),
        "status": "ingested",
        "metadata": {"char_count": len(req.content), "word_count": len(req.content.split())},
    }
    orchestrator.sources.append(source)

    return {
        "source_id": source["id"],
        "name": source["name"],
        "word_count": source["metadata"]["word_count"],
        "total_sources": len(orchestrator.sources),
        "message": f"Source '{req.name}' added. Total: {len(orchestrator.sources)} source(s).",
    }


@app.post("/api/sources/add-url")
async def add_url_source(req: URLSourceRequest):
    """Fetch and add a URL as a source."""
    orchestrator = _sessions.get(req.session_id)
    if not orchestrator:
        orchestrator = AgentOrchestrator(req.session_id)
        _sessions[req.session_id] = orchestrator

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(req.url, follow_redirects=True,
                                    headers={"User-Agent": "Mozilla/5.0"})
            html = resp.text

        # Extract readable text from HTML
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        text = "\n".join(line for line in text.splitlines() if len(line.strip()) > 30)[:8000]

        name = req.name or req.url.split("/")[2]
        source = {
            "id": f"src-{uuid.uuid4().hex[:8]}",
            "type": "web",
            "name": name,
            "content": text,
            "url": req.url,
            "credibility_score": 0.75,
            "recency_score": 1.0,
            "timestamp": _now(),
            "status": "ingested",
            "metadata": {"url": req.url, "char_count": len(text)},
        }
        orchestrator.sources.append(source)

        return {
            "source_id": source["id"],
            "name": name,
            "char_count": len(text),
            "total_sources": len(orchestrator.sources),
            "message": f"URL scraped and added. Total: {len(orchestrator.sources)} source(s).",
        }
    except Exception as e:
        raise HTTPException(400, f"Could not fetch URL: {str(e)}")


@app.post("/api/sources/upload-file")
async def upload_file(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a file (CSV, TXT, PDF text). Extracts text content."""
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        orchestrator = AgentOrchestrator(session_id)
        _sessions[session_id] = orchestrator

    raw = await file.read()
    filename = file.filename or "uploaded_file"
    ext = filename.lower().split(".")[-1]

    try:
        if ext == "pdf":
            # Try pymupdf, fallback to raw text decode
            try:
                import fitz  # type: ignore
                doc = fitz.open(stream=raw, filetype="pdf")
                text = "\n".join(page.get_text() for page in doc)
            except Exception:
                text = raw.decode("utf-8", errors="ignore")
        elif ext == "csv":
            import io
            import pandas as pd
            df = pd.read_csv(io.BytesIO(raw))
            text = f"CSV Data ({len(df)} rows, {len(df.columns)} columns):\n"
            text += f"Columns: {', '.join(df.columns)}\n\n"
            text += df.to_string(max_rows=100, index=False)
        else:
            text = raw.decode("utf-8", errors="ignore")

        text = text[:10000]  # Limit per source
        source = {
            "id": f"src-{uuid.uuid4().hex[:8]}",
            "type": ext if ext in ["pdf", "csv"] else "text",
            "name": filename,
            "content": text,
            "credibility_score": 0.88,
            "recency_score": 0.95,
            "timestamp": _now(),
            "status": "ingested",
            "metadata": {"filename": filename, "size_bytes": len(raw)},
        }
        orchestrator.sources.append(source)

        return {
            "source_id": source["id"],
            "name": filename,
            "char_count": len(text),
            "total_sources": len(orchestrator.sources),
            "message": f"File '{filename}' uploaded. Total: {len(orchestrator.sources)} source(s).",
        }
    except Exception as e:
        raise HTTPException(400, f"File processing error: {str(e)}")


@app.get("/api/sources/{session_id}")
async def get_sources(session_id: str):
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        raise HTTPException(404, "Session not found")
    return {"session_id": session_id, "sources": orchestrator.sources}


@app.delete("/api/sources/{session_id}/{source_id}")
async def delete_source(session_id: str, source_id: str):
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        raise HTTPException(404, "Session not found")
    orchestrator.sources = [s for s in orchestrator.sources if s["id"] != source_id]
    return {"message": "Source removed", "remaining": len(orchestrator.sources)}


# ─── Analysis ─────────────────────────────────────────────────────────────────

@app.post("/api/analyze/{session_id}")
async def analyze(session_id: str):
    """Run real Gemini analysis on all uploaded sources."""
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        raise HTTPException(404, "Session not found. Create session and add sources first.")
    if not orchestrator.sources:
        raise HTTPException(400, "No sources added. Add at least one source before analyzing.")

    result = await orchestrator.run_full_analysis(orchestrator.sources)

    return {
        "session_id": session_id,
        "status": "complete",
        "insights_count": len(result["insights"]),
        "contradictions_count": len(result["contradictions"]),
        "actions_count": len(result["actions"]),
        "trace_steps": result["trace_steps"],
        "summary": result.get("summary", ""),
        "urgency": result.get("urgency", "high"),
        "insights": result["insights"],
        "contradictions": result["contradictions"],
        "noise_report": result["noise_report"],
        "trends": result["trends"],
        "actions": result["actions"],
        "constraint_summary": result["constraint_summary"],
        "workplan": result["workplan"],
    }


# ─── Execute ──────────────────────────────────────────────────────────────────

@app.post("/api/execute/{session_id}")
async def execute_chain(session_id: str):
    """Execute the action chain (mobile-friendly, returns all steps)."""
    orchestrator = _sessions.get(session_id)
    if not orchestrator or not orchestrator.actions:
        raise HTTPException(404, "No action plan found. Run /api/analyze first.")

    steps = []
    async for event in orchestrator.execute_action_chain():
        steps.append(event)

    return {"session_id": session_id, "steps": steps, "total": len(steps)}


@app.get("/api/execute/stream/{session_id}")
async def execute_stream(session_id: str):
    """SSE stream for web clients."""
    orchestrator = _sessions.get(session_id)
    if not orchestrator or not orchestrator.actions:
        raise HTTPException(404, "Run /api/analyze first.")

    async def gen():
        async for event in orchestrator.execute_action_chain():
            yield dict(data=json.dumps(event), event=event.get("event", "update"))

    return EventSourceResponse(gen())


# ─── Outcome & Trace ──────────────────────────────────────────────────────────

@app.get("/api/outcome/{session_id}")
async def get_outcome(session_id: str):
    orchestrator = _sessions.get(session_id)
    if not orchestrator or not orchestrator.before_state:
        raise HTTPException(404, "No execution data. Run /api/execute first.")

    total_cost = sum(e.cost_actual for e in orchestrator.executions)
    total_latency = sum(e.latency_ms for e in orchestrator.executions)

    return {
        "session_id": session_id,
        "before_state": orchestrator.before_state.model_dump(),
        "after_state": orchestrator.system_state.model_dump(),
        "total_cost_pkr": total_cost,
        "total_latency_ms": total_latency,
        "actions_succeeded": sum(1 for e in orchestrator.executions if e.status == ActionStatus.SUCCESS),
        "actions_recovered": sum(1 for e in orchestrator.executions if e.recovery_action),
        "executions": [e.model_dump() for e in orchestrator.executions],
    }


@app.get("/api/trace/{session_id}")
async def get_trace(session_id: str):
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        raise HTTPException(404, "Session not found.")
    return {
        "session_id": session_id,
        "total_steps": len(orchestrator.tracer.get_all()),
        "entries": [e.model_dump() for e in orchestrator.tracer.get_all()],
    }


@app.get("/api/trace/export/{session_id}")
async def export_trace(session_id: str):
    orchestrator = _sessions.get(session_id)
    if not orchestrator:
        raise HTTPException(404, "Session not found.")
    return JSONResponse(
        content=orchestrator.tracer.export_json(),
        headers={"Content-Disposition": f"attachment; filename=trace_{session_id[:8]}.json"}
    )


# ─── Import inside functions to avoid circular ────────────────────────────────
from models.models import ActionStatus


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
