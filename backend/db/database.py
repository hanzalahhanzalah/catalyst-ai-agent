"""
Database schema and connection management.
Uses aiosqlite for async SQLite operations.
"""
import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DATABASE_URL", "./agent.db")


async def get_db():
    """Get a database connection."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Initialize all database tables."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                content TEXT,
                raw_content TEXT,
                metadata TEXT,
                credibility_score REAL DEFAULT 0.7,
                recency_score REAL DEFAULT 1.0,
                timestamp TEXT,
                ingested_at TEXT,
                status TEXT DEFAULT 'pending'
            );

            CREATE TABLE IF NOT EXISTS insights (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                sources TEXT,
                confidence REAL DEFAULT 0.8,
                impact_level TEXT DEFAULT 'medium',
                metric TEXT,
                value TEXT,
                trend TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS contradictions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                metric TEXT NOT NULL,
                source_a_id TEXT,
                source_b_id TEXT,
                value_a TEXT,
                value_b TEXT,
                winner_id TEXT,
                resolution_reason TEXT,
                investigation_path TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS actions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                name TEXT NOT NULL,
                type TEXT,
                description TEXT,
                cost_pkr REAL DEFAULT 0,
                time_estimate_hours REAL DEFAULT 1,
                dependencies TEXT,
                constraints_violated TEXT,
                status TEXT DEFAULT 'pending',
                sequence_order INTEGER,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS action_executions (
                id TEXT PRIMARY KEY,
                action_id TEXT,
                session_id TEXT,
                before_state TEXT,
                after_state TEXT,
                cost_actual REAL DEFAULT 0,
                latency_ms INTEGER DEFAULT 0,
                status TEXT,
                error_message TEXT,
                recovery_action TEXT,
                retry_count INTEGER DEFAULT 0,
                executed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS traces (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                step_index INTEGER,
                trace_type TEXT,
                tool_name TEXT,
                tool_input TEXT,
                tool_output TEXT,
                reasoning TEXT,
                decision TEXT,
                timestamp TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT,
                status TEXT DEFAULT 'initializing',
                system_state TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)
        await db.commit()
    print(f"[DB] Database initialized at {DB_PATH}")
