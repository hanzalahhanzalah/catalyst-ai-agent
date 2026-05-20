"""
Failure recovery and rollback engine.
Handles retries, substitutions, and state rollbacks for failed actions.
"""
import asyncio
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from models.models import ActionStatus


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Recovery strategy definitions per error type
RECOVERY_STRATEGIES = {
    "api_failure": {
        "primary": "retry",
        "max_retries": 3,
        "backoff_seconds": [1, 2, 4],
        "fallback": "substitute",
        "description": "API failure — retrying with exponential backoff"
    },
    "budget_exceeded": {
        "primary": "substitute",
        "max_retries": 1,
        "fallback": "skip",
        "description": "Budget exceeded — substituting with lower-cost alternative"
    },
    "timeout": {
        "primary": "retry",
        "max_retries": 2,
        "backoff_seconds": [2, 5],
        "fallback": "rollback",
        "description": "Timeout — retrying with longer timeout window"
    },
    "data_invalid": {
        "primary": "rollback",
        "max_retries": 0,
        "fallback": "skip",
        "description": "Invalid data — rolling back state to checkpoint"
    },
    "supplier_unavailable": {
        "primary": "substitute",
        "max_retries": 0,
        "fallback": "skip",
        "description": "Primary supplier unavailable — switching to secondary supplier"
    },
}

# Substitute action definitions
SUBSTITUTE_ACTIONS = {
    "Simulate Emergency Air Freight Order": {
        "name": "Contact Secondary Supplier (Dubai Hub)",
        "description": (
            "Primary supplier (Pakistan Industrial Suppliers) API timeout. "
            "Escalating to Dubai Industrial Hub — 2-day air freight. "
            "Cost: PKR 487,500 for 300 units. Delivery: 2026-05-20."
        ),
        "cost_pkr": 487500,
        "time_estimate_hours": 1.5,
    }
}


async def attempt_recovery(
    action_id: str,
    action_name: str,
    error_type: str,
    current_state: Dict[str, Any],
    retry_count: int = 0,
) -> Dict[str, Any]:
    """
    Attempt to recover from a failed action.
    Returns recovery result with new state and log.
    """
    strategy = RECOVERY_STRATEGIES.get(error_type, RECOVERY_STRATEGIES["api_failure"])
    recovery_log = []
    recovered = False
    new_state = dict(current_state)
    recovery_action_name = None
    final_status = ActionStatus.FAILED

    recovery_log.append({
        "step": "assess",
        "message": f"Error type '{error_type}' detected. Strategy: {strategy['description']}",
        "timestamp": _now(),
    })

    if strategy["primary"] == "retry" and retry_count < strategy["max_retries"]:
        backoff = strategy.get("backoff_seconds", [1, 2, 4])
        wait_time = backoff[min(retry_count, len(backoff) - 1)]

        recovery_log.append({
            "step": "retry",
            "message": f"Retry attempt {retry_count + 1}/{strategy['max_retries']} after {wait_time}s backoff",
            "timestamp": _now(),
        })

        # Simulate backoff wait (reduced for demo)
        await asyncio.sleep(0.5)

        # Simulate retry success (80% chance after retry)
        if random.random() < 0.80:
            recovered = True
            final_status = ActionStatus.SUCCESS
            recovery_log.append({
                "step": "retry_success",
                "message": f"Retry succeeded on attempt {retry_count + 1}",
                "timestamp": _now(),
            })
        else:
            recovery_log.append({
                "step": "retry_failed",
                "message": "Retry also failed. Escalating to fallback strategy.",
                "timestamp": _now(),
            })

    if not recovered and strategy["primary"] == "substitute" or (not recovered and strategy.get("fallback") == "substitute"):
        substitute = SUBSTITUTE_ACTIONS.get(action_name)
        if substitute:
            recovery_action_name = substitute["name"]
            final_status = ActionStatus.SUCCESS
            recovered = True
            recovery_log.append({
                "step": "substitute",
                "message": f"Substituting with: '{substitute['name']}'. {substitute['description']}",
                "timestamp": _now(),
            })
            # Apply substitute state changes
            new_state["emergency_order_placed"] = True
            new_state["pending_orders"] = current_state.get("pending_orders", 0) + 300

    if not recovered and strategy.get("fallback") == "rollback":
        final_status = ActionStatus.ROLLED_BACK
        recovery_log.append({
            "step": "rollback",
            "message": "Rolling back state to last checkpoint. Action effects reversed.",
            "timestamp": _now(),
        })
        new_state = dict(current_state)  # Restore original state

    if not recovered and strategy.get("fallback") == "skip":
        final_status = ActionStatus.SKIPPED
        recovery_log.append({
            "step": "skip",
            "message": "Action skipped after all recovery attempts failed. Continuing chain.",
            "timestamp": _now(),
        })

    return {
        "recovered": recovered,
        "final_status": final_status,
        "recovery_action_name": recovery_action_name,
        "new_state": new_state,
        "recovery_log": recovery_log,
    }
