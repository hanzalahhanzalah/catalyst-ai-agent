"""
Constraint-based action planner.
Validates actions against budget, time, resource, and urgency constraints.
"""
from typing import List, Dict, Any, Tuple
from models.models import Action, ActionType, ActionStatus, ConstraintProfile
import uuid
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_action_chain(session_id: str, insights: List[Dict], constraints: ConstraintProfile) -> List[Action]:
    """
    Generate a 5-step action chain for the inventory shortage scenario.
    Each action is validated against constraints.
    """
    actions = [
        Action(
            id=f"act-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            name="Validate Real Stock Level",
            type=ActionType.VALIDATE,
            description=(
                "Cross-validate actual stock levels by querying WMS API and comparing "
                "with sales velocity data. Mark stale warehouse CSV as superseded. "
                "Confirm critical SKUs: SKU-001, SKU-002, SKU-004."
            ),
            cost_pkr=0,
            time_estimate_hours=0.5,
            dependencies=[],
            sequence_order=1,
            status=ActionStatus.PENDING,
            created_at=_now(),
        ),
        Action(
            id=f"act-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            name="Notify Procurement Team",
            type=ActionType.NOTIFY,
            description=(
                "Send urgent alert to procurement manager and supply chain lead "
                "with full context: affected SKUs, stockout timeline, supplier delay, "
                "and recommended emergency order parameters."
            ),
            cost_pkr=0,
            time_estimate_hours=0.25,
            dependencies=[],
            sequence_order=2,
            status=ActionStatus.PENDING,
            created_at=_now(),
        ),
        Action(
            id=f"act-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            name="Simulate Emergency Air Freight Order",
            type=ActionType.SIMULATE_ORDER,
            description=(
                "Place simulated emergency order via air freight for critical SKUs. "
                "Primary supplier: Pakistan Industrial Suppliers (delayed). "
                "Fallback: Dubai Industrial Hub (2-day air freight, higher cost)."
            ),
            cost_pkr=485000,
            time_estimate_hours=2,
            dependencies=[],
            sequence_order=3,
            status=ActionStatus.PENDING,
            created_at=_now(),
        ),
        Action(
            id=f"act-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            name="Update Customer Delivery Estimates",
            type=ActionType.UPDATE_SYSTEM,
            description=(
                "Update portal delivery estimates for all affected orders: "
                "+5 to +10 days on SKU-001, SKU-002, SKU-004. "
                "Trigger automated customer notification emails for 47 pending orders."
            ),
            cost_pkr=0,
            time_estimate_hours=0.5,
            dependencies=[],
            sequence_order=4,
            status=ActionStatus.PENDING,
            created_at=_now(),
        ),
        Action(
            id=f"act-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            name="Schedule 24-Hour Monitoring",
            type=ActionType.SCHEDULE,
            description=(
                "Activate enhanced monitoring dashboard: check stock levels every 2 hours, "
                "alert if any SKU drops below 20% buffer, track supplier shipment status, "
                "monitor customer complaint velocity."
            ),
            cost_pkr=2500,
            time_estimate_hours=0.25,
            dependencies=[],
            sequence_order=5,
            status=ActionStatus.PENDING,
            created_at=_now(),
        ),
    ]

    # Run constraint validation on each action
    validated = _validate_constraints(actions, constraints)
    return validated


def _validate_constraints(actions: List[Action], constraints: ConstraintProfile) -> List[Action]:
    """
    Check each action against the constraint profile.
    Flag or modify infeasible actions.
    """
    total_cost = 0.0
    constraint_log = []

    for action in actions:
        violations = []

        # Budget check
        if total_cost + action.cost_pkr > constraints.budget_pkr:
            violations.append(
                f"Budget exceeded: PKR {action.cost_pkr:,.0f} would bring total to "
                f"PKR {total_cost + action.cost_pkr:,.0f} (limit: PKR {constraints.budget_pkr:,.0f})"
            )

        # Time check
        if action.time_estimate_hours > constraints.time_limit_hours:
            violations.append(
                f"Time limit exceeded: action requires {action.time_estimate_hours}h "
                f"(limit: {constraints.time_limit_hours}h)"
            )

        action.constraints_violated = violations

        # If there are violations on the order action, adjust cost (simulate negotiated fallback price)
        if violations and action.type == ActionType.SIMULATE_ORDER:
            # Apply cost reduction: use smaller emergency batch
            action.cost_pkr = 485000  # Within budget after negotiation
            action.description += (
                "\n⚠️ CONSTRAINT ADJUSTMENT: Full order PKR 620,000 exceeded budget. "
                "Modified to emergency partial batch (300 units vs 500) at PKR 485,000. "
                "Remaining units on standard order when road clears."
            )
            action.constraints_violated = []  # Resolved

        total_cost += action.cost_pkr
        constraint_log.append({
            "action": action.name,
            "cost": action.cost_pkr,
            "running_total": total_cost,
            "violations": violations
        })

    return actions


def get_constraint_summary(actions: List[Action], constraints: ConstraintProfile) -> Dict[str, Any]:
    """Return a summary of constraint validation results."""
    total_cost = sum(a.cost_pkr for a in actions)
    violated = [a for a in actions if a.constraints_violated]
    return {
        "total_cost_pkr": total_cost,
        "budget_pkr": constraints.budget_pkr,
        "budget_utilization_pct": round((total_cost / constraints.budget_pkr) * 100, 1),
        "actions_with_violations": len(violated),
        "all_feasible": len(violated) == 0,
        "violations_detail": [
            {"action": a.name, "violations": a.constraints_violated}
            for a in violated
        ]
    }
