import asyncio
import io
from typing import Callable

import chess
import chess.pgn

from app.repositories.analysis_repository import AnalysisRepository, MoveAnalysisRecord
from app.services.coaching_generator import CoachingGenerator, validate_suggested_move
from app.services.move_classifier import (
    AnalysisStatus,
    MoveClassification,
    MoveEvalContext,
    classify_move,
    compute_accuracy,
    compute_centipawn_loss,
    estimate_game_rating,
)
from app.services.stockfish import StockfishService


ENGINE_VERSION = "stockfish"
ANALYSIS_DEPTH = 16
BATCH_SIZE = 8


class GameAnalyzerService:
    """Full-game Stockfish analysis + coaching orchestration."""

    def __init__(
        self,
        stockfish: StockfishService,
        repository: AnalysisRepository | None = None,
        coaching: CoachingGenerator | None = None,
    ) -> None:
        self._stockfish = stockfish
        self._repo = repository or AnalysisRepository()
        self._coaching = coaching or CoachingGenerator()

    async def run_analysis(
        self,
        game_id: str,
        on_progress: Callable[[str, int, int], None] | None = None,
    ) -> None:
        game = self._repo.get_game(game_id)
        if not game:
            raise ValueError(f"Game {game_id} not found")

        try:
            self._repo.update_status(
                game_id, AnalysisStatus.ANALYZING.value,
                progress_message="Analyzing game with Stockfish...",
            )

            moves = await self._analyze_all_moves(game.pgn, game_id, on_progress)
            self._repo.save_moves(game_id, moves)

            critical = [m for m in moves if m.is_critical]
            self._repo.update_status(
                game_id, AnalysisStatus.GENERATING_COACHING.value,
                progress_message=f"Found {len(critical)} critical moments. Generating coaching...",
                progress_current=len(moves),
                progress_total=len(moves),
            )

            # Batch LLM coaching for critical moves (token-efficient)
            coaching_moves = [
                m for m in critical
                if m.classification not in (
                    MoveClassification.BOOK.value,
                    MoveClassification.FORCED.value,
                )
            ][:20]

            for i in range(0, len(coaching_moves), BATCH_SIZE):
                batch = coaching_moves[i : i + BATCH_SIZE]
                outputs = await self._coaching.generate_coaching_batch(
                    batch, game.player_username
                )
                for out in outputs:
                    move = next((m for m in batch if m.move_index == out.move_index), None)
                    if not move:
                        continue
                    suggested_san = out.suggested_move_san
                    if suggested_san:
                        validated = validate_suggested_move(move.fen_before, suggested_san)
                        suggested_san = validated or move.best_move_san
                    else:
                        suggested_san = None

                    self._repo.update_move_coaching(game_id, out.move_index, {
                        "headline": out.headline,
                        "explanation": out.explanation,
                        "teaching_point": out.teaching_point,
                        "encouragement": out.encouragement,
                        "suggested_move": suggested_san,
                        "suggested_move_san": suggested_san,
                        "suggested_line": out.suggested_line,
                    })

            # Fill basic coaching for non-critical good moves
            for m in moves:
                if m.is_critical:
                    continue
                self._repo.update_move_coaching(game_id, m.move_index, {
                    "headline": "Good move" if m.classification == MoveClassification.GOOD.value else "Solid play",
                    "explanation": "A reasonable choice that keeps the position comfortable.",
                    "teaching_point": None,
                    "encouragement": "Well played." if m.centipawn_loss < 15 else None,
                    "suggested_move": None,
                    "suggested_move_san": None,
                    "suggested_line": None,
                })

            sides = [m.side for m in moves]
            classifications = [m.classification for m in moves]
            white_acc = compute_accuracy(classifications, "white", sides)
            black_acc = compute_accuracy(classifications, "black", sides)

            try:
                summary = await self._coaching.generate_summary(
                    game.player_username,
                    game.opponent_username,
                    self._extract_result(game.pgn),
                    [m for m in moves if m.is_critical][:10],
                    white_acc,
                    black_acc,
                )
            except RuntimeError:
                summary = CoachingGenerator._fallback_summary(critical)

            self._repo.complete_analysis(
                game_id,
                summary=summary,
                white_accuracy=white_acc,
                black_accuracy=black_acc,
                white_game_rating=estimate_game_rating(white_acc),
                black_game_rating=estimate_game_rating(black_acc),
                engine_version=ENGINE_VERSION,
                engine_depth=ANALYSIS_DEPTH,
            )
        except Exception as exc:
            self._repo.update_status(
                game_id,
                AnalysisStatus.FAILED.value,
                error_message=str(exc),
                progress_message="Analysis failed",
            )
            raise

    async def _analyze_all_moves(
        self,
        pgn: str,
        game_id: str,
        on_progress: Callable[[str, int, int], None] | None,
    ) -> list[MoveAnalysisRecord]:
        parsed = chess.pgn.read_game(io.StringIO(pgn))
        if parsed is None:
            raise ValueError("Invalid PGN")

        board = parsed.board()
        move_list: list[chess.Move] = list(parsed.mainline_moves())
        total = len(move_list)
        results: list[MoveAnalysisRecord] = []

        for idx, move in enumerate(move_list, start=1):
            fen_before = board.fen()
            side = "white" if board.turn == chess.WHITE else "black"
            move_number = board.fullmove_number

            before_analysis = await self._stockfish.analyze(fen_before, depth=ANALYSIS_DEPTH)
            eval_before = before_analysis.evaluation

            best_san = before_analysis.best_move
            best_uci = None
            if before_analysis.principal_variation:
                temp = board.copy()
                try:
                    for san in before_analysis.principal_variation[:1]:
                        best_uci = temp.parse_san(san).uci()
                except ValueError:
                    pass

            san = board.san(move)
            uci = move.uci()
            board.push(move)
            fen_after = board.fen()

            after_analysis = await self._stockfish.analyze(fen_after, depth=ANALYSIS_DEPTH)
            eval_after = after_analysis.evaluation

            cp_loss = compute_centipawn_loss(eval_before, eval_after, side)
            ctx = MoveEvalContext(
                move_index=idx,
                side=side,
                san=san,
                uci=uci,
                fen_before=fen_before,
                evaluation_before=eval_before,
                evaluation_after=eval_after,
                best_move_san=best_san,
                best_move_uci=best_uci,
                centipawn_loss=cp_loss,
                is_book=idx <= 16,
            )
            classification, is_critical = classify_move(ctx)

            results.append(MoveAnalysisRecord(
                move_index=idx,
                move_number=move_number,
                side=side,
                san=san,
                uci=uci,
                fen_before=fen_before,
                fen_after=fen_after,
                evaluation_before=eval_before,
                evaluation_after=eval_after,
                best_move=best_uci,
                best_move_san=best_san,
                principal_variation=before_analysis.principal_variation,
                centipawn_loss=cp_loss,
                classification=classification.value,
                is_critical=is_critical,
            ))

            if on_progress:
                on_progress(f"Analyzed {idx} / {total} moves", idx, total)
            self._repo.update_status(
                game_id,
                AnalysisStatus.ANALYZING.value,
                progress_message=f"Analyzed {idx} / {total} moves",
                progress_current=idx,
                progress_total=total,
            )

        return results

    @staticmethod
    def _extract_result(pgn: str) -> str:
        game = chess.pgn.read_game(io.StringIO(pgn))
        if game and game.headers.get("Result"):
            return game.headers["Result"]
        return "*"
