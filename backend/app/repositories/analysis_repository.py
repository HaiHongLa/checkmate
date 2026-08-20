import sqlite3
import io
import json
from dataclasses import dataclass
from datetime import datetime, timezone

import chess
import chess.pgn

from app.db.database import get_connection, init_db
from app.services.move_classifier import AnalysisStatus


def make_game_id(source: str, source_game_id: str) -> str:
    return f"{source}:{source_game_id}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class GameAnalysisRecord:
    game_id: str
    source: str
    source_game_id: str
    player_username: str
    opponent_username: str | None
    pgn: str
    engine_version: str | None
    engine_depth: int | None
    analysis_version: str
    status: str
    summary: str | None
    white_accuracy: float | None
    black_accuracy: float | None
    white_game_rating: float | None
    black_game_rating: float | None
    progress_message: str | None
    progress_current: int
    progress_total: int
    error_message: str | None
    generated_at: str | None
    updated_at: str


@dataclass
class MoveAnalysisRecord:
    move_index: int
    move_number: int
    side: str
    san: str
    uci: str
    fen_before: str
    fen_after: str
    evaluation_before: float | None
    evaluation_after: float | None
    best_move: str | None
    best_move_san: str | None
    principal_variation: list[str]
    centipawn_loss: float
    classification: str
    is_critical: bool
    coaching_headline: str | None = None
    coaching_explanation: str | None = None
    coaching_teaching_point: str | None = None
    coaching_encouragement: str | None = None
    suggested_move: str | None = None
    suggested_move_san: str | None = None
    suggested_line: str | None = None
    coaching_generated: bool = False


class AnalysisRepository:
    def __init__(self) -> None:
        init_db()

    def get_game(self, game_id: str) -> GameAnalysisRecord | None:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM game_analyses WHERE game_id = ?", (game_id,)
            ).fetchone()
        return self._row_to_game(row) if row else None

    def get_moves(self, game_id: str) -> list[MoveAnalysisRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM move_analyses WHERE game_id = ? ORDER BY move_index",
                (game_id,),
            ).fetchall()
        return [self._row_to_move(r) for r in rows]

    def upsert_game(
        self,
        *,
        game_id: str,
        source: str,
        source_game_id: str,
        player_username: str,
        opponent_username: str | None,
        pgn: str,
        status: str = AnalysisStatus.NOT_ANALYZED.value,
        engine_version: str | None = None,
        engine_depth: int | None = None,
        analysis_version: str = "v1",
    ) -> GameAnalysisRecord:
        now = _now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO game_analyses (
                    game_id, source, source_game_id, player_username, opponent_username,
                    pgn, engine_version, engine_depth, analysis_version, status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game_id) DO UPDATE SET
                    pgn = excluded.pgn,
                    player_username = excluded.player_username,
                    opponent_username = excluded.opponent_username,
                    updated_at = excluded.updated_at
                """,
                (
                    game_id, source, source_game_id, player_username, opponent_username,
                    pgn, engine_version, engine_depth, analysis_version, status, now,
                ),
            )
            conn.commit()
        return self.get_game(game_id)  # type: ignore[return-value]

    def update_status(
        self,
        game_id: str,
        status: str,
        *,
        progress_message: str | None = None,
        progress_current: int | None = None,
        progress_total: int | None = None,
        error_message: str | None = None,
    ) -> None:
        fields = ["status = ?", "updated_at = ?"]
        values: list = [status, _now()]
        if progress_message is not None:
            fields.append("progress_message = ?")
            values.append(progress_message)
        if progress_current is not None:
            fields.append("progress_current = ?")
            values.append(progress_current)
        if progress_total is not None:
            fields.append("progress_total = ?")
            values.append(progress_total)
        if error_message is not None:
            fields.append("error_message = ?")
            values.append(error_message)
        values.append(game_id)
        with get_connection() as conn:
            conn.execute(
                f"UPDATE game_analyses SET {', '.join(fields)} WHERE game_id = ?",
                values,
            )
            conn.commit()

    def save_moves(self, game_id: str, moves: list[MoveAnalysisRecord]) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM move_analyses WHERE game_id = ?", (game_id,))
            for m in moves:
                conn.execute(
                    """
                    INSERT INTO move_analyses (
                        game_id, move_index, move_number, side, san, uci,
                        fen_before, fen_after, evaluation_before, evaluation_after,
                        best_move, best_move_san, principal_variation,
                        centipawn_loss, classification, is_critical,
                        coaching_headline, coaching_explanation, coaching_teaching_point,
                        coaching_encouragement, suggested_move, suggested_move_san,
                        suggested_line, coaching_generated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        game_id, m.move_index, m.move_number, m.side, m.san, m.uci,
                        m.fen_before, m.fen_after, m.evaluation_before, m.evaluation_after,
                        m.best_move, m.best_move_san, json.dumps(m.principal_variation),
                        m.centipawn_loss, m.classification, int(m.is_critical),
                        m.coaching_headline, m.coaching_explanation, m.coaching_teaching_point,
                        m.coaching_encouragement, m.suggested_move, m.suggested_move_san,
                        m.suggested_line, int(m.coaching_generated),
                    ),
                )
            conn.commit()

    def complete_analysis(
        self,
        game_id: str,
        *,
        summary: str,
        white_accuracy: float,
        black_accuracy: float,
        white_game_rating: float,
        black_game_rating: float,
        engine_version: str,
        engine_depth: int,
    ) -> None:
        now = _now()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE game_analyses SET
                    status = ?, summary = ?,
                    white_accuracy = ?, black_accuracy = ?,
                    white_game_rating = ?, black_game_rating = ?,
                    engine_version = ?, engine_depth = ?,
                    generated_at = ?, updated_at = ?,
                    progress_message = ?, error_message = NULL
                WHERE game_id = ?
                """,
                (
                    AnalysisStatus.COMPLETE.value, summary,
                    white_accuracy, black_accuracy,
                    white_game_rating, black_game_rating,
                    engine_version, engine_depth,
                    now, now, "Analysis complete", game_id,
                ),
            )
            conn.commit()

    def delete_analysis(self, game_id: str) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM move_analyses WHERE game_id = ?", (game_id,))
            conn.execute(
                """
                UPDATE game_analyses SET
                    status = ?, summary = NULL,
                    white_accuracy = NULL, black_accuracy = NULL,
                    white_game_rating = NULL, black_game_rating = NULL,
                    generated_at = NULL, error_message = NULL,
                    progress_message = NULL, progress_current = 0, progress_total = 0,
                    updated_at = ?
                WHERE game_id = ?
                """,
                (AnalysisStatus.NOT_ANALYZED.value, _now(), game_id),
            )
            conn.commit()

    def update_move_coaching(
        self, game_id: str, move_index: int, coaching: dict
    ) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE move_analyses SET
                    coaching_headline = ?,
                    coaching_explanation = ?,
                    coaching_teaching_point = ?,
                    coaching_encouragement = ?,
                    suggested_move = ?,
                    suggested_move_san = ?,
                    suggested_line = ?,
                    coaching_generated = 1
                WHERE game_id = ? AND move_index = ?
                """,
                (
                    coaching.get("headline"),
                    coaching.get("explanation"),
                    coaching.get("teaching_point"),
                    coaching.get("encouragement"),
                    coaching.get("suggested_move"),
                    coaching.get("suggested_move_san"),
                    coaching.get("suggested_line"),
                    game_id, move_index,
                ),
            )
            conn.commit()

    @staticmethod
    def _row_to_game(row: sqlite3.Row) -> GameAnalysisRecord:
        return GameAnalysisRecord(
            game_id=row["game_id"],
            source=row["source"],
            source_game_id=row["source_game_id"],
            player_username=row["player_username"],
            opponent_username=row["opponent_username"],
            pgn=row["pgn"],
            engine_version=row["engine_version"],
            engine_depth=row["engine_depth"],
            analysis_version=row["analysis_version"],
            status=row["status"],
            summary=row["summary"],
            white_accuracy=row["white_accuracy"],
            black_accuracy=row["black_accuracy"],
            white_game_rating=row["white_game_rating"],
            black_game_rating=row["black_game_rating"],
            progress_message=row["progress_message"],
            progress_current=row["progress_current"] or 0,
            progress_total=row["progress_total"] or 0,
            error_message=row["error_message"],
            generated_at=row["generated_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _row_to_move(row: sqlite3.Row) -> MoveAnalysisRecord:
        pv = json.loads(row["principal_variation"] or "[]")
        return MoveAnalysisRecord(
            move_index=row["move_index"],
            move_number=row["move_number"],
            side=row["side"],
            san=row["san"],
            uci=row["uci"],
            fen_before=row["fen_before"],
            fen_after=row["fen_after"],
            evaluation_before=row["evaluation_before"],
            evaluation_after=row["evaluation_after"],
            best_move=row["best_move"],
            best_move_san=row["best_move_san"],
            principal_variation=pv,
            centipawn_loss=row["centipawn_loss"] or 0,
            classification=row["classification"],
            is_critical=bool(row["is_critical"]),
            coaching_headline=row["coaching_headline"],
            coaching_explanation=row["coaching_explanation"],
            coaching_teaching_point=row["coaching_teaching_point"],
            coaching_encouragement=row["coaching_encouragement"],
            suggested_move=row["suggested_move"],
            suggested_move_san=row["suggested_move_san"],
            suggested_line=row["suggested_line"],
            coaching_generated=bool(row["coaching_generated"]),
        )


# sqlite3 used for Row type hints above