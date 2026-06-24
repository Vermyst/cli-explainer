"""
db.py — SQLite persistence layer for CLI Error Explainer
Handles history lookup, saving entries, feedback, and stats.
"""

import sqlite3
import hashlib
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cli_explainer.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # allows dict-style access
    return conn


def init_db():
    """Create the history table if it doesn't exist."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            error_hash TEXT,
            command TEXT,
            exit_code INTEGER,
            error_output TEXT,
            explanation TEXT,
            fix TEXT,
            worked INTEGER,
            used_count INTEGER DEFAULT 1,
            os_info TEXT,
            shell TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def make_hash(command: str, error_output: str) -> str:
    """MD5 of command name + first 80 chars of error — used for deduplication."""
    cmd_name = command.strip().split()[0] if command.strip() else command
    key = cmd_name + error_output[:80]
    return hashlib.md5(key.encode()).hexdigest()


def lookup_history(command: str, error_output: str) -> dict | None:
    """
    Check if we've seen this error before.
    Returns the best matching row (highest worked + used_count) or None.
    """
    init_db()
    error_hash = make_hash(command, error_output)

    conn = get_connection()
    row = conn.execute("""
        SELECT * FROM history
        WHERE error_hash = ?
        ORDER BY
            CASE WHEN worked = 1 THEN 0 ELSE 1 END,
            used_count DESC
        LIMIT 1
    """, (error_hash,)).fetchone()

    if row:
        # Increment used_count since we're surfacing this entry
        conn.execute(
            "UPDATE history SET used_count = used_count + 1 WHERE id = ?",
            (row["id"],)
        )
        conn.commit()

    conn.close()
    return dict(row) if row else None


def save_entry(command, exit_code, error_output, explanation, fix, os_info, shell) -> int | None:
    """Save a new error + AI explanation to history. Returns the new row id."""
    init_db()
    error_hash = make_hash(command, error_output)

    conn = get_connection()
    cursor = conn.execute("""
        INSERT INTO history
            (error_hash, command, exit_code, error_output, explanation, fix, os_info, shell)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (error_hash, command, exit_code, error_output, explanation, fix, os_info, shell))
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id


def update_feedback(entry_id: int, worked: bool):
    """Record whether the suggested fix actually worked."""
    init_db()
    conn = get_connection()
    conn.execute(
        "UPDATE history SET worked = ? WHERE id = ?",
        (1 if worked else 0, entry_id)
    )
    conn.commit()
    conn.close()


def get_stats():
    """Print error statistics to terminal."""
    init_db()
    conn = get_connection()

    total = conn.execute("SELECT COUNT(*) FROM history").fetchone()[0]
    unique = conn.execute("SELECT COUNT(DISTINCT error_hash) FROM history").fetchone()[0]
    success = conn.execute(
        "SELECT COUNT(*) FROM history WHERE worked = 1"
    ).fetchone()[0]
    rated = conn.execute(
        "SELECT COUNT(*) FROM history WHERE worked IS NOT NULL"
    ).fetchone()[0]

    top_errors = conn.execute("""
        SELECT command, used_count, worked
        FROM history
        ORDER BY used_count DESC
        LIMIT 5
    """).fetchall()

    conn.close()

    # Use display module to print nicely
    from display import print_stats
    print_stats(total, unique, success, rated, [dict(r) for r in top_errors])
