"""
Pydantic models for all domain objects.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum


class SourceType(str, Enum):
    PDF = "pdf"
    WEB = "web"
    CSV = "csv"
    JSON = "json"
    FEED = "feed"


class SourceStatus(str, Enum):
    PENDING = "pending"
    INGESTED = "ingested"
    FAILED = "failed"


class InsightType(str, Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    TREND = "trend"
    ANOMALY = "anomaly"
    CONTRADICTION = "contradiction"
    SIGNAL = "signal"


class ActionType(str, Enum):
    VALIDATE = "validate"
    NOTIFY = "notify"
    SIMULATE_ORDER = "simulate_order"
    UPDATE_SYSTEM = "update_system"
    SCHEDULE = "schedule"
    INVESTIGATE = "investigate"
    ROLLBACK = "rollback"


class ActionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    SKIPPED = "skipped"
    ROLLED_BACK = "rolled_back"


class TraceType(str, Enum):
    PLANNING = "planning"
    TOOL_CALL = "tool_call"
    CONSTRAINT_CHECK = "constraint_check"
    DECISION = "decision"
    FAILURE = "failure"
    RECOVERY = "recovery"
    OUTCOME = "outcome"


# ─── Source Models ────────────────────────────────────────────────────────────

class SourceDocument(BaseModel):
    id: str
    type: SourceType
    name: str
    content: str = ""
    raw_content: str = ""
    metadata: Dict[str, Any] = {}
    credibility_score: float = 0.7
    recency_score: float = 1.0
    timestamp: Optional[str] = None
    ingested_at: Optional[str] = None
    status: SourceStatus = SourceStatus.PENDING


class SourceIngestRequest(BaseModel):
    type: SourceType
    name: str
    url: Optional[str] = None
    content: Optional[str] = None


# ─── Insight Models ───────────────────────────────────────────────────────────

class Insight(BaseModel):
    id: str
    session_id: str
    type: InsightType
    title: str
    description: str
    sources: List[str] = []
    confidence: float = 0.8
    impact_level: str = "medium"
    metric: Optional[str] = None
    value: Optional[str] = None
    trend: Optional[str] = None
    created_at: Optional[str] = None


class Contradiction(BaseModel):
    id: str
    session_id: str
    metric: str
    source_a_id: str
    source_b_id: str
    value_a: str
    value_b: str
    winner_id: Optional[str] = None
    resolution_reason: str = ""
    investigation_path: List[str] = []
    created_at: Optional[str] = None


# ─── Action Models ────────────────────────────────────────────────────────────

class ConstraintProfile(BaseModel):
    budget_pkr: float = 500000
    time_limit_hours: float = 24
    resource_units: int = 5
    urgency_level: str = "high"
    api_rate_limit: int = 100


class Action(BaseModel):
    id: str
    session_id: str
    name: str
    type: ActionType
    description: str
    cost_pkr: float = 0
    time_estimate_hours: float = 1
    dependencies: List[str] = []
    constraints_violated: List[str] = []
    status: ActionStatus = ActionStatus.PENDING
    sequence_order: int = 0
    created_at: Optional[str] = None


class ActionExecution(BaseModel):
    id: str
    action_id: str
    session_id: str
    before_state: Dict[str, Any] = {}
    after_state: Dict[str, Any] = {}
    cost_actual: float = 0
    latency_ms: int = 0
    status: ActionStatus
    error_message: Optional[str] = None
    recovery_action: Optional[str] = None
    retry_count: int = 0
    executed_at: Optional[str] = None


# ─── Trace Models ─────────────────────────────────────────────────────────────

class TraceEntry(BaseModel):
    id: str
    session_id: str
    step_index: int
    trace_type: TraceType
    tool_name: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    tool_output: Optional[Any] = None
    reasoning: Optional[str] = None
    decision: Optional[str] = None
    timestamp: str


# ─── Session / State Models ───────────────────────────────────────────────────

class SystemState(BaseModel):
    stock_level_units: int = 1200
    stockout_risk_pct: float = 75.0
    supplier_status: str = "unreliable"
    pending_orders: int = 0
    customer_notifications_sent: int = 0
    delivery_estimate_days: int = 7
    monitoring_active: bool = False
    emergency_order_placed: bool = False
    last_validated_at: Optional[str] = None


class Session(BaseModel):
    id: str
    name: str
    status: str = "initializing"
    system_state: SystemState = SystemState()
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ─── Response Models ──────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    session_id: str
    sources: List[SourceDocument]
    insights: List[Insight]
    contradictions: List[Contradiction]
    actions: List[Action]
    constraints: ConstraintProfile
    workplan: List[str]
    trace_entries: List[TraceEntry]


class OutcomeResult(BaseModel):
    session_id: str
    before_state: SystemState
    after_state: SystemState
    total_cost_pkr: float
    total_latency_ms: int
    actions_succeeded: int
    actions_failed: int
    actions_recovered: int
    projected_stockout_risk_reduction_pct: float
    executions: List[ActionExecution]
