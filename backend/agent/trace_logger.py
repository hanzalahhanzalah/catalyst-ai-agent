"""
Antigravity Trace Logger.
Records every agent decision, tool call, and state change.
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from models.models import TraceEntry, TraceType
from db.database import get_db


class TraceLogger:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.step_index = 0
        self._entries: list[TraceEntry] = []

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def log(
        self,
        trace_type: TraceType,
        reasoning: Optional[str] = None,
        decision: Optional[str] = None,
        tool_name: Optional[str] = None,
        tool_input: Optional[Dict[str, Any]] = None,
        tool_output: Optional[Any] = None,
    ) -> TraceEntry:
        entry = TraceEntry(
            id=str(uuid.uuid4()),
            session_id=self.session_id,
            step_index=self.step_index,
            trace_type=trace_type,
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            reasoning=reasoning,
            decision=decision,
            timestamp=self._now(),
        )
        self.step_index += 1
        self._entries.append(entry)

        # Persist to database
        try:
            db = await get_db()
            await db.execute(
                """INSERT INTO traces (id, session_id, step_index, trace_type, tool_name,
                   tool_input, tool_output, reasoning, decision, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    entry.id,
                    entry.session_id,
                    entry.step_index,
                    entry.trace_type.value,
                    entry.tool_name,
                    json.dumps(entry.tool_input) if entry.tool_input else None,
                    json.dumps(entry.tool_output) if entry.tool_output else str(entry.tool_output),
                    entry.reasoning,
                    entry.decision,
                    entry.timestamp,
                ),
            )
            await db.commit()
            await db.close()
        except Exception as e:
            print(f"[TraceLogger] DB write error: {e}")

        return entry

    def get_all(self) -> list[TraceEntry]:
        return self._entries

    def export_json(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "total_steps": self.step_index,
            "generated_at": self._now(),
            "entries": [e.model_dump() for e in self._entries],
        }
