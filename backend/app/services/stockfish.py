import asyncio
from dataclasses import dataclass

import chess
import chess.engine

from app.chess.fen import validate_fen


@dataclass
class AnalysisResult:
    evaluation: float
    best_move: str
    principal_variation: list[str]
    depth: int
    mate_in: int | None = None


class StockfishService:
    """Wrapper around Stockfish for position analysis."""

    def __init__(self, stockfish_path: str) -> None:
        self._path = stockfish_path
        self._engine: chess.engine.SimpleEngine | None = None
        self._lock = asyncio.Lock()

    def _get_engine(self) -> chess.engine.SimpleEngine:
        if self._engine is None:
            try:
                self._engine = chess.engine.SimpleEngine.popen_uci(self._path)
            except (chess.engine.EngineError, FileNotFoundError, OSError) as exc:
                raise RuntimeError(
                    f"Stockfish unavailable at '{self._path}': {exc}"
                ) from exc
        return self._engine

    async def analyze(self, fen: str, depth: int = 15) -> AnalysisResult:
        board = validate_fen(fen)

        async with self._lock:
            result = await asyncio.to_thread(self._analyze_sync, board, depth)

        return result

    def _analyze_sync(self, board: chess.Board, depth: int) -> AnalysisResult:
        engine = self._get_engine()
        limit = chess.engine.Limit(depth=depth)

        try:
            info = engine.analyse(board, limit)
        except chess.engine.EngineError as exc:
            raise RuntimeError(f"Stockfish analysis failed: {exc}") from exc

        score = info["score"].white()
        mate_in = score.mate() if score.is_mate() else None

        if score.is_mate():
            evaluation = 100.0 if score.mate() > 0 else -100.0
        else:
            evaluation = score.score() / 100.0

        pv_moves = info.get("pv", [])
        pv_san = []
        temp_board = board.copy()
        for move in pv_moves[:10]:
            try:
                san = temp_board.san(move)
                pv_san.append(san)
                temp_board.push(move)
            except ValueError:
                break

        best_move = pv_san[0] if pv_san else ""

        return AnalysisResult(
            evaluation=round(evaluation, 2),
            best_move=best_move,
            principal_variation=pv_san,
            depth=info.get("depth", depth),
            mate_in=mate_in,
        )

    def close(self) -> None:
        if self._engine is not None:
            self._engine.quit()
            self._engine = None
