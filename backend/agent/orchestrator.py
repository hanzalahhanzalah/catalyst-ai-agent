"""
Catalyst AI — True Agentic Orchestrator
Gemini 2.5 Flash drives every step:
  1. Workplan generation
  2. Insight extraction
  3. Contradiction detection
  4. Impact scoring
  5. Constraint-aware action planning
  6. Dynamic execution with probabilistic failure + recovery
"""
import os, uuid, json, asyncio, random, time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator

from dotenv import load_dotenv
load_dotenv()

from models.models import (
    Action, ActionExecution, ActionStatus, ActionType,
    TraceType, ConstraintProfile, SystemState
)
from agent.trace_logger import TraceLogger
from agent.recovery import attempt_recovery

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-flash-latest",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_client():
    from google import genai
    return genai.Client(api_key=GEMINI_API_KEY)


class AgentOrchestrator:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.tracer = TraceLogger(session_id)
        self.client = _get_client()
        self.sources: List[Dict] = []
        self.insights: List[Dict] = []
        self.contradictions: List[Dict] = []
        self.actions: List[Action] = []
        self.system_state = SystemState()
        self.before_state: Optional[SystemState] = None
        self.executions: List[ActionExecution] = []
        self.constraints = ConstraintProfile()
        self._domain: str = "general"
        self._urgency: str = "medium"

    # ── Gemini Call with Fallback ─────────────────────────────────────────────

    def _call_gemini(self, prompt: str) -> str:
        """Synchronous Gemini call with model fallback."""
        last_error = None
        for model in GEMINI_MODELS:
            try:
                resp = self.client.models.generate_content(model=model, contents=prompt)
                print(f"[Gemini] OK {model}")
                return resp.text
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    print(f"[Gemini] {model} rate-limited → next...")
                    last_error = e
                    time.sleep(1)   # short sleep — moved heavy waits to async layer
                    continue
                elif "503" in err or "UNAVAILABLE" in err:
                    print(f"[Gemini] {model} unavailable → next...")
                    last_error = e
                    time.sleep(1)
                    continue
                raise
        raise last_error

    async def _call_gemini_async(self, prompt: str) -> str:
        """Run synchronous Gemini call in thread pool — never blocks the event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._call_gemini, prompt)

    def _parse_json(self, text: str) -> Any:
        text = text.strip()
        for delim in ["```json", "```"]:
            if delim in text:
                text = text.split(delim)[1].split("```")[0].strip()
                break
        return json.loads(text)

    # ── Step 1+2 Combined: Domain Detection + Deep Analysis (single Gemini call) ──

    async def _detect_and_analyze(self, source_block: str) -> dict:
        """Merged prompt: detect domain AND extract insights in ONE Gemini call instead of two.
        This saves ~10-15 seconds by eliminating a full round-trip."""
        prompt = f"""You are an autonomous AI business analyst. Analyze the following business sources.

Return a single JSON object with ALL fields below:

{{
  "domain": "inventory|sales|hr|finance|operations|customer_service|marketing|supply_chain|general",
  "urgency": "critical|high|medium|low",
  "primary_problem": "One sentence description of the core problem",
  "key_entities": ["entity1", "entity2"],
  "metrics_to_track": ["metric1", "metric2"],
  "time_sensitivity": "immediate|within_24h|within_week|long_term",
  "insights": [
    {{
      "type": "risk|opportunity|trend|anomaly|contradiction|signal",
      "title": "Clear, specific title with numbers",
      "description": "2-3 sentence analysis with specific evidence",
      "impact_level": "critical|high|medium|low",
      "confidence": 0.95,
      "metric": "metric_name",
      "value": "quantified value",
      "trend": "RISING|FALLING|CRITICAL|STABLE|SPIKE",
      "sources_referenced": ["source name"]
    }}
  ],
  "contradictions": [
    {{
      "metric": "what_they_conflict_on",
      "source_a": "source name",
      "value_a": "what source A says",
      "source_b": "source name",
      "value_b": "what source B says",
      "winner": "more reliable source name",
      "resolution_reason": "Why this source wins",
      "investigation_path": ["Verify with X"]
    }}
  ],
  "noise": {{"filtered_count": 0, "stale_sources": [], "reason": "Noise analysis"}},
  "trends": [
    {{"product": "what is trending", "direction": "UP|DOWN|CRITICAL|STABLE", "change_pct": 25, "insight": "One-line explanation"}}
  ],
  "system_state_before": {{
    "stockout_risk_pct": 40, "pending_orders": 0,
    "customer_notifications_sent": 0, "delivery_estimate_days": 7,
    "monitoring_active": false, "emergency_order_placed": false
  }},
  "summary": "2-3 sentence executive summary",
  "stock_level_units": 0
}}

RULES:
- Extract 5-8 insights — be specific, use numbers from content
- Every field must come from actual content, not assumptions
- Return ONLY valid JSON

SOURCES:
{source_block}"""

        raw = await self._call_gemini_async(prompt)
        result = self._parse_json(raw)

        await self.tracer.log(
            TraceType.PLANNING,
            reasoning=f"Domain: {result.get('domain','general')} | Problem: {result.get('primary_problem','')}",
            decision=f"Urgency: {result.get('urgency','medium').upper()} | Extracted {len(result.get('insights',[]))} insights",
        )
        return result

    # ── Step 3: Action Planning ───────────────────────────────────────────────

    async def _plan_actions(self, analysis: dict, domain_ctx: dict) -> list:
        insight_summaries = "\n".join([
            f"- [{i['impact_level'].upper()}] {i['title']}: {i['value']}"
            for i in analysis.get("insights", [])[:8]
        ])

        prompt = f"""You are an autonomous action planning agent.

SITUATION: {domain_ctx.get('primary_problem', '')}
URGENCY: {domain_ctx.get('urgency', 'medium').upper()}
BUDGET LIMIT: PKR {self.constraints.budget_pkr:,.0f}
TIME LIMIT: {self.constraints.time_limit_hours} hours

KEY INSIGHTS TO ADDRESS:
{insight_summaries}

Generate 4-6 specific, executable actions to address these issues.
Return JSON array:

[
  {{
    "name": "Specific action name (not generic)",
    "description": "Detailed what/why/how — 2-3 sentences with specifics from the insights",
    "type": "validate|notify|simulate_order|update_system|schedule",
    "cost_estimate": 5000,
    "time_hours": 1.5,
    "priority": "critical|high|medium",
    "expected_impact": "Specific measurable outcome",
    "addresses_insight": "which insight this resolves"
  }}
]

RULES:
- Actions must directly address the extracted insights — not generic steps
- Include at least one validate, one notify, and one high-cost action
- Total cost must not exceed PKR {self.constraints.budget_pkr:,.0f}
- If an action would exceed budget, reduce scope and note it in description
- Be specific — use actual entities/products/metrics from the insights

Return ONLY a valid JSON array."""

        raw = await self._call_gemini_async(prompt)
        actions_raw = self._parse_json(raw)

        built = []
        total_cost = 0.0
        for i, item in enumerate(actions_raw):
            cost = float(item.get("cost_estimate", 0))
            adjusted = False
            if total_cost + cost > self.constraints.budget_pkr:
                cost = max(0, self.constraints.budget_pkr - total_cost) * 0.95
                adjusted = True

            action = Action(
                id=str(uuid.uuid4()),
                session_id=self.session_id,
                name=item.get("name", f"Action {i+1}"),
                description=item.get("description", "") + (
                    "\n⚠️ Cost adjusted to fit budget constraint." if adjusted else ""
                ),
                type=self._map_type(item.get("type", "validate")),
                cost_pkr=cost,
                time_estimate_hours=float(item.get("time_hours", 1)),
                status=ActionStatus.PENDING,
                sequence_order=i + 1,
                constraints_violated=["budget_adjusted"] if adjusted else [],
                rationale=item.get("expected_impact", ""),
            )
            built.append(action)
            total_cost += cost

        await self.tracer.log(
            TraceType.TOOL_CALL,
            tool_name="generate_action_plan",
            tool_input={"insight_count": len(analysis.get("insights", []))},
            tool_output={
                "actions": len(built),
                "total_cost_pkr": total_cost,
                "budget_utilization": f"{total_cost/self.constraints.budget_pkr*100:.1f}%",
            },
            reasoning=f"Gemini generated {len(built)} targeted actions from the insights. Total cost: PKR {total_cost:,.0f}.",
            decision="Constraint validation complete. Action chain ready for execution."
        )
        return built

    # ── Main Analysis Entry Point ─────────────────────────────────────────────

    async def run_full_analysis(self, sources: List[Dict]) -> Dict[str, Any]:
        self.sources = sources

        # Cap source block to avoid huge token counts (major speed win)
        source_block = ""
        for s in sources:
            content = s['content'][:3000]  # max 3k chars per source
            source_block += (
                f"\n\n=== {s['name']} "
                f"[{s['type'].upper()}, credibility={s.get('credibility_score',0.8)}, "
                f"date={s.get('timestamp','')[:10]}] ===\n{content}"
            )
        source_block = source_block[:8000]  # hard cap total

        # Single combined Gemini call (domain + analysis merged = saves ~10-15s)
        analysis = await self._detect_and_analyze(source_block)
        domain_ctx = {
            "domain":           analysis.get("domain", "general"),
            "urgency":          analysis.get("urgency", "medium"),
            "primary_problem":  analysis.get("primary_problem", ""),
            "key_entities":     analysis.get("key_entities", []),
            "metrics_to_track": analysis.get("metrics_to_track", []),
            "time_sensitivity": analysis.get("time_sensitivity", "within_24h"),
        }
        self._domain  = domain_ctx["domain"]
        self._urgency = domain_ctx["urgency"]

        # Build insights
        self.insights = []
        for item in analysis.get("insights", []):
            self.insights.append({
                "id": f"ins-{uuid.uuid4().hex[:8]}",
                "session_id": self.session_id,
                "type": item.get("type", "signal"),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "impact_level": item.get("impact_level", "medium"),
                "confidence": float(item.get("confidence", 0.8)),
                "metric": item.get("metric", ""),
                "value": str(item.get("value", "")),
                "trend": item.get("trend", ""),
                "sources": item.get("sources_referenced", []),
                "created_at": _now(),
            })

        await self.tracer.log(
            TraceType.TOOL_CALL,
            tool_name="extract_insights",
            tool_input={"source_count": len(sources)},
            tool_output={"count": len(self.insights), "critical": sum(1 for i in self.insights if i["impact_level"] == "critical")},
            reasoning=f"Extracted {len(self.insights)} insights. {sum(1 for i in self.insights if i['impact_level']=='critical')} critical issues identified.",
            decision="Proceeding to contradiction analysis."
        )

        # Build contradictions
        self.contradictions = []
        for item in analysis.get("contradictions", []):
            self.contradictions.append({
                "id": f"con-{uuid.uuid4().hex[:8]}",
                "session_id": self.session_id,
                "metric": item.get("metric", ""),
                "source_a_id": item.get("source_a", ""),
                "source_b_id": item.get("source_b", ""),
                "value_a": str(item.get("value_a", "")),
                "value_b": str(item.get("value_b", "")),
                "winner_id": item.get("winner", ""),
                "resolution_reason": item.get("resolution_reason", ""),
                "investigation_path": item.get("investigation_path", []),
            })

        if self.contradictions:
            await self.tracer.log(
                TraceType.TOOL_CALL,
                tool_name="detect_contradictions",
                tool_input={"compared": len(sources)},
                tool_output={"found": len(self.contradictions), "details": [c["metric"] for c in self.contradictions]},
                reasoning=f"{len(self.contradictions)} contradiction(s) found between sources.",
                decision="Contradictions resolved via credibility + recency weighting."
            )

        noise = analysis.get("noise", {"filtered_count": 0, "reason": "No noise detected"})
        noise["clean_source_ids"] = [s["id"] for s in sources]
        trends = analysis.get("trends", [])

        await self.tracer.log(
            TraceType.DECISION,
            reasoning=analysis.get("summary", "Analysis complete."),
            decision=f"Domain: {self._domain.upper()}. Urgency: {self._urgency.upper()}. Building action chain now."
        )

        # Step 3: Action planning
        self.actions = await self._plan_actions(analysis, domain_ctx)

        await self.tracer.log(
            TraceType.CONSTRAINT_CHECK,
            reasoning=f"Budget: PKR {self.constraints.budget_pkr:,.0f}. Total actions cost: PKR {sum(a.cost_pkr for a in self.actions):,.0f}.",
            decision="APPROVED — All actions within constraints. Ready to execute."
        )

        # Set initial system state from Gemini's analysis
        before = analysis.get("system_state_before", {})
        self.system_state = SystemState(
            stockout_risk_pct=float(before.get("stockout_risk_pct", 50)),
            pending_orders=int(before.get("pending_orders", 0)),
            customer_notifications_sent=int(before.get("customer_notifications_sent", 0)),
            delivery_estimate_days=int(before.get("delivery_estimate_days", 7)),
            monitoring_active=bool(before.get("monitoring_active", False)),
            emergency_order_placed=bool(before.get("emergency_order_placed", False)),
        )

        return {
            "session_id": self.session_id,
            "sources": sources,
            "insights": self.insights,
            "contradictions": self.contradictions,
            "noise_report": noise,
            "trends": trends,
            "actions": [a.model_dump() for a in self.actions],
            "constraint_summary": {
                "total_cost_pkr": sum(a.cost_pkr for a in self.actions),
                "budget_pkr": self.constraints.budget_pkr,
                "budget_utilization_pct": round(sum(a.cost_pkr for a in self.actions) / self.constraints.budget_pkr * 100, 1),
            },
            "workplan": [
                f"1. INGEST: Loaded {len(sources)} source(s) — scored credibility & recency",
                f"2. DOMAIN: Gemini identified domain as '{self._domain}' (urgency: {self._urgency})",
                "3. ANALYZE: Gemini extracted insights, contradictions, and trends",
                "4. PLAN: Gemini generated targeted action chain with constraint validation",
                "5. EXECUTE: Simulate actions with state tracking and failure recovery",
                "6. OUTCOME: Before/after comparison with projected impact",
            ],
            "summary": analysis.get("summary", ""),
            "urgency": analysis.get("urgency", "medium"),
            "domain": self._domain,
            "trace_steps": len(self.tracer.get_all()),
        }

    # ── Execution ─────────────────────────────────────────────────────────────

    async def execute_action_chain(self) -> AsyncGenerator[Dict[str, Any], None]:
        self.before_state = SystemState(**self.system_state.model_dump())
        total_cost = 0.0
        total_latency = 0

        # Randomly choose ONE action to fail (not always index 2)
        # Prefer a high-cost action for dramatic effect
        costly_indices = [i for i, a in enumerate(self.actions) if a.cost_pkr > 1000]
        fail_index = random.choice(costly_indices) if costly_indices else (
            random.randint(1, len(self.actions) - 2) if len(self.actions) > 2 else -1
        )

        for i, action in enumerate(self.actions):
            start_ms = int(time.time() * 1000)
            action.status = ActionStatus.RUNNING
            recovery = None

            yield {
                "event": "action_start",
                "action_id": action.id,
                "action_name": action.name,
                "sequence": action.sequence_order,
                "status": "running",
                "timestamp": _now(),
            }

            before = SystemState(**self.system_state.model_dump())
            await asyncio.sleep(0.4)

            force_fail = (i == fail_index) and len(self.actions) >= 3

            if force_fail:
                action.status = ActionStatus.FAILED
                await self.tracer.log(
                    TraceType.FAILURE,
                    tool_name="execute_action",
                    tool_input={"action_id": action.id, "action_name": action.name},
                    tool_output={"error": "External service timeout / API unavailable"},
                    reasoning=f"Action '{action.name}' failed: external dependency timed out after 30s.",
                    decision="Triggering recovery protocol: retry → substitute → rollback."
                )

                yield {
                    "event": "action_failed",
                    "action_id": action.id,
                    "action_name": action.name,
                    "error": f"'{action.name}' — external service timeout. Triggering recovery...",
                    "timestamp": _now(),
                }

                recovery = await attempt_recovery(
                    action.id, action.name, "api_failure",
                    self.system_state.model_dump(), retry_count=0
                )

                recovery_label = recovery.get("recovery_action_name") or "Retry + Substitute"

                await self.tracer.log(
                    TraceType.RECOVERY,
                    tool_name="handle_failure",
                    tool_input={"action_id": action.id},
                    tool_output={"recovery": recovery_label, "status": recovery["final_status"].value},
                    reasoning="Recovery strategy: retry with backoff → substitute secondary provider.",
                    decision=f"Recovered via: {recovery_label}. Continuing chain."
                )

                action.status = recovery["final_status"]
                self.system_state = SystemState(**recovery["new_state"])
                self._apply_state_change(action, i)

                yield {
                    "event": "action_recovered",
                    "action_id": action.id,
                    "recovery_action": recovery_label,
                    "final_status": recovery["final_status"].value,
                    "timestamp": _now(),
                }
            else:
                action.status = ActionStatus.SUCCESS
                self._apply_state_change(action, i)

                await self.tracer.log(
                    TraceType.TOOL_CALL,
                    tool_name="execute_action",
                    tool_input={"action_id": action.id},
                    tool_output={"status": "success", "cost": action.cost_pkr},
                    reasoning=f"'{action.name}' completed. State updated.",
                    decision="Proceeding to next action."
                )

            latency = int(time.time() * 1000) - start_ms
            total_latency += latency
            total_cost += action.cost_pkr

            self.executions.append(ActionExecution(
                id=str(uuid.uuid4()),
                action_id=action.id,
                session_id=self.session_id,
                before_state=before.model_dump(),
                after_state=self.system_state.model_dump(),
                cost_actual=action.cost_pkr,
                latency_ms=latency,
                status=action.status,
                error_message="Timeout" if force_fail else None,
                recovery_action=recovery.get("recovery_action_name") if recovery else None,
                retry_count=1 if force_fail else 0,
                executed_at=_now(),
            ))

            yield {
                "event": "action_complete",
                "action_id": action.id,
                "action_name": action.name,
                "status": action.status.value,
                "before_state": before.model_dump(),
                "after_state": self.system_state.model_dump(),
                "cost_pkr": action.cost_pkr,
                "latency_ms": latency,
                "running_total_cost": total_cost,
                "timestamp": _now(),
            }

        await self.tracer.log(
            TraceType.OUTCOME,
            tool_name="compute_outcome",
            tool_input={"session_id": self.session_id},
            tool_output=self._compute_outcome(total_cost, total_latency),
            reasoning="All actions complete. Computing before/after impact metrics.",
            decision="Execution chain finished successfully."
        )

        yield {
            "event": "chain_complete",
            "before_state": self.before_state.model_dump(),
            "after_state": self.system_state.model_dump(),
            "total_cost_pkr": total_cost,
            "total_latency_ms": total_latency,
            "outcome": self._compute_outcome(total_cost, total_latency),
            "timestamp": _now(),
        }

    def _apply_state_change(self, action: Action, index: int):
        s = self.system_state
        t = action.type
        if t == ActionType.VALIDATE:
            s.last_validated_at = _now()
            s.stockout_risk_pct = max(s.stockout_risk_pct - 5, 0)
        elif t == ActionType.NOTIFY:
            s.customer_notifications_sent += 20
            s.stockout_risk_pct = max(s.stockout_risk_pct - 3, 0)
        elif t == ActionType.SIMULATE_ORDER:
            s.pending_orders += 300
            s.emergency_order_placed = True
            s.stockout_risk_pct = max(s.stockout_risk_pct - 40, 3)
        elif t == ActionType.UPDATE_SYSTEM:
            s.customer_notifications_sent += 27
            s.delivery_estimate_days = max(s.delivery_estimate_days + 2, 5)
            s.stockout_risk_pct = max(s.stockout_risk_pct - 10, 3)
        elif t == ActionType.SCHEDULE:
            s.monitoring_active = True
            s.stockout_risk_pct = max(s.stockout_risk_pct - 2, 3)

    def _map_type(self, t: str) -> ActionType:
        return {
            "validate": ActionType.VALIDATE, "notify": ActionType.NOTIFY,
            "simulate_order": ActionType.SIMULATE_ORDER,
            "update_system": ActionType.UPDATE_SYSTEM, "schedule": ActionType.SCHEDULE,
        }.get(t, ActionType.VALIDATE)

    def _compute_outcome(self, total_cost: float, total_latency: int) -> Dict:
        if not self.before_state:
            return {}
        return {
            "stockout_risk_before": self.before_state.stockout_risk_pct,
            "stockout_risk_after": self.system_state.stockout_risk_pct,
            "risk_reduction_pct": self.before_state.stockout_risk_pct - self.system_state.stockout_risk_pct,
            "emergency_order_placed": self.system_state.emergency_order_placed,
            "customers_notified": self.system_state.customer_notifications_sent,
            "monitoring_active": self.system_state.monitoring_active,
            "total_cost_pkr": total_cost,
            "total_latency_ms": total_latency,
            "actions_succeeded": sum(1 for e in self.executions if e.status == ActionStatus.SUCCESS),
            "actions_recovered": sum(1 for e in self.executions if e.recovery_action),
            "domain": self._domain,
        }
