"""
Google Antigravity (Gemini 2.0 Flash) Tool Definitions.
These are the 8 core tools the agent can call during its reasoning loop.
Every call is logged to the Antigravity trace.
"""
import os
import json
from typing import Any

# Tool declarations for Gemini function calling
AGENT_TOOLS = [
    {
        "name": "ingest_source",
        "description": (
            "Load and preprocess a single data source. Extracts text content, "
            "metadata, and assigns initial credibility and recency scores. "
            "Returns a structured SourceDocument."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "source_id": {
                    "type": "string",
                    "description": "The unique ID of the source to ingest"
                }
            },
            "required": ["source_id"]
        }
    },
    {
        "name": "extract_insights",
        "description": (
            "Analyze ingested source documents to extract meaningful insights including "
            "risks, opportunities, trends, anomalies, and key signals. "
            "Performs temporal analysis to detect changes over time."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of source IDs to analyze"
                },
                "focus_metrics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific metrics to focus on (e.g., stock_level, sales_velocity)"
                }
            },
            "required": ["source_ids"]
        }
    },
    {
        "name": "detect_contradictions",
        "description": (
            "Compare insights across multiple sources to identify conflicting claims. "
            "Scores source credibility and recency, determines which source to trust, "
            "and generates an investigation path for unresolvable conflicts."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "insight_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Insight IDs to compare for contradictions"
                }
            },
            "required": ["insight_ids"]
        }
    },
    {
        "name": "score_credibility",
        "description": (
            "Assign or update credibility and recency scores for a source. "
            "Considers: source type, timestamp, known reliability, data freshness, "
            "and cross-validation with other sources."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string"},
                "reason": {"type": "string", "description": "Reason for credibility adjustment"}
            },
            "required": ["source_id"]
        }
    },
    {
        "name": "generate_action_plan",
        "description": (
            "Generate a prioritized chain of 3-5 interconnected actions based on the "
            "extracted insights. Each action includes cost, time estimate, and dependencies. "
            "The constraint engine validates actions against budget, time, and resource limits."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "insight_ids": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "constraints": {
                    "type": "object",
                    "properties": {
                        "budget_pkr": {"type": "number"},
                        "time_limit_hours": {"type": "number"},
                        "urgency_level": {"type": "string"}
                    }
                }
            },
            "required": ["insight_ids"]
        }
    },
    {
        "name": "execute_action",
        "description": (
            "Simulate execution of a specific action in the action chain. "
            "Mutates the system state and returns before/after state, cost, and latency. "
            "Has a realistic failure simulation for demo purposes."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action_id": {"type": "string"},
                "force_failure": {
                    "type": "boolean",
                    "description": "Force a failure for demo purposes"
                }
            },
            "required": ["action_id"]
        }
    },
    {
        "name": "handle_failure",
        "description": (
            "Handle a failed action by attempting recovery strategies: "
            "retry with backoff, substitute with alternative action, or rollback state. "
            "Returns the recovery outcome and updated system state."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action_id": {"type": "string"},
                "error_type": {
                    "type": "string",
                    "enum": ["api_failure", "budget_exceeded", "timeout", "data_invalid", "supplier_unavailable"]
                },
                "recovery_strategy": {
                    "type": "string",
                    "enum": ["retry", "substitute", "rollback", "skip"]
                }
            },
            "required": ["action_id", "error_type"]
        }
    },
    {
        "name": "compute_outcome",
        "description": (
            "Calculate the final outcome metrics by comparing before and after system states. "
            "Returns: stockout risk reduction, cost summary, latency totals, "
            "and projected 7-day impact."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"}
            },
            "required": ["session_id"]
        }
    }
]


def get_gemini_tools():
    """Convert tool definitions to Gemini function declarations format."""
    try:
        import google.generativeai as genai
        from google.generativeai.types import Tool, FunctionDeclaration

        declarations = []
        for tool in AGENT_TOOLS:
            declarations.append(
                FunctionDeclaration(
                    name=tool["name"],
                    description=tool["description"],
                    parameters=tool["parameters"],
                )
            )
        return [Tool(function_declarations=declarations)]
    except ImportError:
        return None


def get_tools_as_dict():
    """Return tools as plain dict (for mock mode)."""
    return AGENT_TOOLS
