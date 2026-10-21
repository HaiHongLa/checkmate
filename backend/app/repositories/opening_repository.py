import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import chess

from app.db.database import get_connection, init_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


@dataclass
class RepertoireRecord:
    id: str
    name: str
    color: str
    created_at: str
    updated_at: str


@dataclass
class LineRecord:
    id: str
    repertoire_id: str
    name: str
    created_at: str
    updated_at: str
    last_practiced_at: str | None
    practice_attempt_count: int


@dataclass
class PlyRecord:
    ply_index: int
    san: str
    uci: str
    fen_after: str
    is_key_position: bool


@dataclass
class ExplanationRecord:
    ply_index: int
    why_move: str | None
    strategic_idea: str | None
    plan_text: str | None
    watch_for: str | None
    remember_this: str | None
    content_version: str
    generated_at: str | None


class OpeningRepository:
    def __init__(self) -> None:
        init_db()

    def list_repertoires(self) -> list[RepertoireRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM opening_repertoires ORDER BY updated_at DESC"
            ).fetchall()
        return [self._row_repertoire(r) for r in rows]

    def create_repertoire(self, name: str, color: str) -> RepertoireRecord:
        rid = _new_id()
        now = _now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO opening_repertoires (id, name, color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (rid, name.strip(), color, now, now),
            )
            conn.commit()
        return self.get_repertoire(rid)  # type: ignore[return-value]

    def get_repertoire(self, repertoire_id: str) -> RepertoireRecord | None:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM opening_repertoires WHERE id = ?", (repertoire_id,)
            ).fetchone()
        return self._row_repertoire(row) if row else None

    def update_repertoire(
        self, repertoire_id: str, *, name: str | None = None
    ) -> RepertoireRecord | None:
        if name is None:
            return self.get_repertoire(repertoire_id)
        with get_connection() as conn:
            conn.execute(
                "UPDATE opening_repertoires SET name = ?, updated_at = ? WHERE id = ?",
                (name.strip(), _now(), repertoire_id),
            )
            conn.commit()
        return self.get_repertoire(repertoire_id)

    def delete_repertoire(self, repertoire_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM opening_repertoires WHERE id = ?", (repertoire_id,)
            )
            conn.commit()
            return cur.rowcount > 0

    def list_lines(self, repertoire_id: str) -> list[LineRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM opening_lines WHERE repertoire_id = ? ORDER BY updated_at DESC",
                (repertoire_id,),
            ).fetchall()
        return [self._row_line(r) for r in rows]

    def create_line(self, repertoire_id: str, name: str) -> LineRecord:
        lid = _new_id()
        now = _now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO opening_lines (
                    id, repertoire_id, name, created_at, updated_at,
                    practice_attempt_count
                ) VALUES (?, ?, ?, ?, ?, 0)
                """,
                (lid, repertoire_id, name.strip(), now, now),
            )
            conn.commit()
        return self.get_line(lid)  # type: ignore[return-value]

    def get_line(self, line_id: str) -> LineRecord | None:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM opening_lines WHERE id = ?", (line_id,)
            ).fetchone()
        return self._row_line(row) if row else None

    def update_line(
        self,
        line_id: str,
        *,
        name: str | None = None,
        record_practice: bool = False,
    ) -> LineRecord | None:
        line = self.get_line(line_id)
        if not line:
            return None
        now = _now()
        with get_connection() as conn:
            if name is not None:
                conn.execute(
                    "UPDATE opening_lines SET name = ?, updated_at = ? WHERE id = ?",
                    (name.strip(), now, line_id),
                )
            if record_practice:
                conn.execute(
                    """
                    UPDATE opening_lines SET
                        last_practiced_at = ?,
                        practice_attempt_count = practice_attempt_count + 1,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (now, now, line_id),
                )
            conn.commit()
        return self.get_line(line_id)

    def delete_line(self, line_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute("DELETE FROM opening_lines WHERE id = ?", (line_id,))
            conn.commit()
            return cur.rowcount > 0

    def get_plies(self, line_id: str) -> list[PlyRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM opening_plies WHERE line_id = ? ORDER BY ply_index",
                (line_id,),
            ).fetchall()
        return [self._row_ply(r) for r in rows]

    def get_explanations(self, line_id: str) -> list[ExplanationRecord]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM opening_explanations WHERE line_id = ? ORDER BY ply_index",
                (line_id,),
            ).fetchall()
        return [self._row_explanation(r) for r in rows]

    def set_key_position(self, line_id: str, ply_index: int, is_key: bool) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE opening_plies SET is_key_position = ?
                WHERE line_id = ? AND ply_index = ?
                """,
                (int(is_key), line_id, ply_index),
            )
            conn.commit()

    def replace_moves(
        self, line_id: str, moves: list[dict]
    ) -> list[PlyRecord]:
        """Validate and save SAN sequence; auto key flags for first 12 plies."""
        board = chess.Board()
        plies: list[PlyRecord] = []
        for idx, m in enumerate(moves, start=1):
            try:
                move = board.parse_san(m["san"])
            except ValueError as exc:
                raise ValueError(f"Illegal move at ply {idx}: {m['san']}") from exc
            san = board.san(move)
            uci = move.uci()
            board.push(move)
            fen_after = board.fen()
            is_key = idx <= 12
            plies.append(
                PlyRecord(
                    ply_index=idx,
                    san=san,
                    uci=uci,
                    fen_after=fen_after,
                    is_key_position=is_key,
                )
            )

        now = _now()
        with get_connection() as conn:
            old_keys = {
                r["ply_index"]: r["is_key_position"]
                for r in conn.execute(
                    "SELECT ply_index, is_key_position FROM opening_plies WHERE line_id = ?",
                    (line_id,),
                ).fetchall()
            }
            conn.execute("DELETE FROM opening_plies WHERE line_id = ?", (line_id,))
            conn.execute(
                "DELETE FROM opening_explanations WHERE line_id = ? AND ply_index > ?",
                (line_id, len(plies)),
            )
            for p in plies:
                is_key = bool(old_keys.get(p.ply_index, p.is_key_position))
                conn.execute(
                    """
                    INSERT INTO opening_plies (
                        line_id, ply_index, san, uci, fen_after, is_key_position
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (line_id, p.ply_index, p.san, p.uci, p.fen_after, int(is_key)),
                )
            conn.execute(
                "UPDATE opening_lines SET updated_at = ? WHERE id = ?",
                (now, line_id),
            )
            conn.execute(
                """
                UPDATE opening_repertoires SET updated_at = ?
                WHERE id = (SELECT repertoire_id FROM opening_lines WHERE id = ?)
                """,
                (now, line_id),
            )
            conn.commit()
        return self.get_plies(line_id)

    def upsert_explanation(
        self, line_id: str, ply_index: int, data: dict
    ) -> None:
        now = _now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO opening_explanations (
                    line_id, ply_index, why_move, strategic_idea, plan_text,
                    watch_for, remember_this, content_version, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'v1', ?)
                ON CONFLICT(line_id, ply_index) DO UPDATE SET
                    why_move = excluded.why_move,
                    strategic_idea = excluded.strategic_idea,
                    plan_text = excluded.plan_text,
                    watch_for = excluded.watch_for,
                    remember_this = excluded.remember_this,
                    generated_at = excluded.generated_at
                """,
                (
                    line_id,
                    ply_index,
                    data.get("why_move"),
                    data.get("strategic_idea"),
                    data.get("plan_text"),
                    data.get("watch_for"),
                    data.get("remember_this"),
                    now,
                ),
            )
            conn.commit()

    def teaching_plies(self, line_id: str) -> list[PlyRecord]:
        plies = self.get_plies(line_id)
        return [p for p in plies if p.is_key_position]

    @staticmethod
    def _row_repertoire(row: sqlite3.Row) -> RepertoireRecord:
        return RepertoireRecord(
            id=row["id"],
            name=row["name"],
            color=row["color"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _row_line(row: sqlite3.Row) -> LineRecord:
        return LineRecord(
            id=row["id"],
            repertoire_id=row["repertoire_id"],
            name=row["name"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            last_practiced_at=row["last_practiced_at"],
            practice_attempt_count=row["practice_attempt_count"] or 0,
        )

    @staticmethod
    def _row_ply(row: sqlite3.Row) -> PlyRecord:
        return PlyRecord(
            ply_index=row["ply_index"],
            san=row["san"],
            uci=row["uci"],
            fen_after=row["fen_after"],
            is_key_position=bool(row["is_key_position"]),
        )

    @staticmethod
    def _row_explanation(row: sqlite3.Row) -> ExplanationRecord:
        return ExplanationRecord(
            ply_index=row["ply_index"],
            why_move=row["why_move"],
            strategic_idea=row["strategic_idea"],
            plan_text=row["plan_text"],
            watch_for=row["watch_for"],
            remember_this=row["remember_this"],
            content_version=row["content_version"],
            generated_at=row["generated_at"],
        )
