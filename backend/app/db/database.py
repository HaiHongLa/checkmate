import os
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", "/app/data/checkmate.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS game_analyses (
    game_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_game_id TEXT NOT NULL,
    player_username TEXT NOT NULL,
    opponent_username TEXT,
    pgn TEXT NOT NULL,
    engine_version TEXT,
    engine_depth INTEGER,
    analysis_version TEXT NOT NULL DEFAULT 'v1',
    status TEXT NOT NULL DEFAULT 'NOT_ANALYZED',
    summary TEXT,
    white_accuracy REAL,
    black_accuracy REAL,
    white_game_rating REAL,
    black_game_rating REAL,
    progress_message TEXT,
    progress_current INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    error_message TEXT,
    generated_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS move_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL REFERENCES game_analyses(game_id) ON DELETE CASCADE,
    move_index INTEGER NOT NULL,
    move_number INTEGER NOT NULL,
    side TEXT NOT NULL,
    san TEXT NOT NULL,
    uci TEXT NOT NULL,
    fen_before TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    evaluation_before REAL,
    evaluation_after REAL,
    best_move TEXT,
    best_move_san TEXT,
    principal_variation TEXT,
    centipawn_loss REAL DEFAULT 0,
    classification TEXT NOT NULL,
    is_critical INTEGER DEFAULT 0,
    coaching_headline TEXT,
    coaching_explanation TEXT,
    coaching_teaching_point TEXT,
    coaching_encouragement TEXT,
    suggested_move TEXT,
    suggested_move_san TEXT,
    suggested_line TEXT,
    coaching_generated INTEGER DEFAULT 0,
    UNIQUE(game_id, move_index)
);

CREATE INDEX IF NOT EXISTS idx_move_analyses_game ON move_analyses(game_id);
"""


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        conn.commit()
