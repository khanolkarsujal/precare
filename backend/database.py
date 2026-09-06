import os
import re
import json
import sqlite3
import logging
from pathlib import Path
from typing import Any, Optional, Union, List, Dict

logger = logging.getLogger("precare.database")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./precare.sqlite").strip()

IS_POSTGRES = DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

# Normalize postgres:// to postgresql:// for standard drivers
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


# -----------------------------------------------------------------------------
# Database Connection Wrapper (Abstracts SQLite and PostgreSQL parameter formats)
# -----------------------------------------------------------------------------
class DatabaseCursor:
    def __init__(self, cursor, is_postgres: bool):
        self._cursor = cursor
        self._is_postgres = is_postgres

    def execute(self, sql: str, params: tuple = ()):
        if self._is_postgres:
            # Convert SQLite '?' parameter placeholders to PostgreSQL '%s' placeholders
            pg_sql = sql.replace("?", "%s")
            return self._cursor.execute(pg_sql, params)
        else:
            return self._cursor.execute(sql, params)

    def fetchone(self) -> Optional[Dict[str, Any]]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        if self._is_postgres:
            return dict(row)
        return dict(row)

    def fetchall(self) -> List[Dict[str, Any]]:
        rows = self._cursor.fetchall()
        if not rows:
            return []
        return [dict(r) for r in rows]

    def close(self):
        self._cursor.close()


class DatabaseConnection:
    def __init__(self, conn, is_postgres: bool):
        self._conn = conn
        self._is_postgres = is_postgres

    def cursor(self) -> DatabaseCursor:
        return DatabaseCursor(self._conn.cursor(), self._is_postgres)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_sqlite_path() -> Path:
    raw_path = DATABASE_URL
    if raw_path.startswith("sqlite:///"):
        raw_path = raw_path.replace("sqlite:///", "", 1)
    elif raw_path.startswith("sqlite://"):
        raw_path = raw_path.replace("sqlite://", "", 1)
    
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def get_connection() -> DatabaseConnection:
    """Obtain a unified connection for either SQLite or PostgreSQL."""
    if IS_POSTGRES:
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            return DatabaseConnection(conn, is_postgres=True)
        except ImportError:
            raise RuntimeError(
                "PostgreSQL connection specified via DATABASE_URL, but 'psycopg2-binary' is not installed. "
                "Run 'pip install psycopg2-binary' or use SQLite for local development."
            )
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL at {DATABASE_URL}: {e}")
            raise
    else:
        db_file = get_sqlite_path()
        conn = sqlite3.connect(str(db_file))
        conn.row_factory = sqlite3.Row
        return DatabaseConnection(conn, is_postgres=False)


def init_db():
    """Create database tables and indices if they do not exist."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Clinics table (compatible with both SQLite and PostgreSQL)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clinics (
                id TEXT PRIMARY KEY,
                clinic_name TEXT NOT NULL,
                doctor_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT DEFAULT '',
                specialization TEXT DEFAULT '',
                location TEXT DEFAULT '',
                languages TEXT DEFAULT '["English"]',
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        """)

        # Cases table (strictly isolated by clinic_id foreign key)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                clinic_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Waiting',
                patient_data TEXT DEFAULT '{}',
                history TEXT DEFAULT '{}',
                conversation TEXT DEFAULT '[]',
                doctor_notes TEXT DEFAULT '',
                soap TEXT DEFAULT '{}',
                doctor_edited_history TEXT DEFAULT '{}',
                submitted_at TEXT NOT NULL,
                submitted_time_label TEXT DEFAULT '',
                submitted_date_label TEXT DEFAULT '',
                completed_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (clinic_id) REFERENCES clinics (id)
            )
        """)

        # Index on clinic_id for fast, isolated queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cases_clinic_id ON cases (clinic_id)
        """)

        conn.commit()
        conn.close()
        
        if IS_POSTGRES:
            logger.info("PreCare Database initialized successfully on PostgreSQL.")
        else:
            logger.info(f"PreCare Database initialized successfully on SQLite at {get_sqlite_path()}.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
