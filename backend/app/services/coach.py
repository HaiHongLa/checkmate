from app.chess.fen import validate_fen
from app.llm.base import LLMMessage
from app.llm.factory import get_llm_provider
from app.services.coach_prompt import COACH_SYSTEM_PROMPT, CoachMode
from app.services.stockfish import AnalysisResult, StockfishService


class CoachService:
    """Orchestrates LLM coaching with optional Stockfish analysis."""

    def __init__(
        self,
        llm_provider=None,
        stockfish: StockfishService | None = None,
    ) -> None:
        self._llm = llm_provider
        self._stockfish = stockfish

    def _get_llm(self):
        if self._llm is not None:
            return self._llm
        return get_llm_provider()

    async def chat(
        self,
        message: str,
        fen: str,
        move_history: list[str],
        *,
        mode: CoachMode | None = None,
        include_analysis: bool = True,
        analysis_depth: int = 12,
        pgn: str | None = None,
        current_move: int | None = None,
        saved_move_analysis: dict | None = None,
        game_summary: str | None = None,
    ) -> tuple[str, AnalysisResult | None]:
        validate_fen(fen)

        analysis: AnalysisResult | None = None
        if include_analysis and self._stockfish is not None:
            try:
                analysis = await self._stockfish.analyze(fen, depth=analysis_depth)
            except (RuntimeError, ValueError):
                analysis = None

        context = self._build_context(
            fen,
            move_history,
            analysis,
            mode,
            pgn=pgn,
            current_move=current_move,
            saved_move_analysis=saved_move_analysis,
            game_summary=game_summary,
        )
        llm = self._get_llm()

        messages = [
            LLMMessage(role="system", content=COACH_SYSTEM_PROMPT),
            LLMMessage(
                role="user",
                content=f"{context}\n\nStudent question: {message}",
            ),
        ]

        response = await llm.chat(messages)
        return response.content, analysis

    def _build_context(
        self,
        fen: str,
        move_history: list[str],
        analysis: AnalysisResult | None,
        mode: CoachMode | None,
        *,
        pgn: str | None = None,
        current_move: int | None = None,
        saved_move_analysis: dict | None = None,
        game_summary: str | None = None,
    ) -> str:
        parts = [
            f"Current FEN: {fen}",
            f"Move history: {', '.join(move_history) if move_history else '(starting position)'}",
        ]

        if current_move is not None:
            parts.append(f"Current move number: {current_move}")

        if saved_move_analysis:
            parts.append("Saved move analysis for this position:")
            for key in (
                "san",
                "classification",
                "coaching_headline",
                "coaching_explanation",
                "coaching_teaching_point",
                "suggested_move_san",
                "centipawn_loss",
            ):
                value = saved_move_analysis.get(key)
                if value:
                    parts.append(f"  {key}: {value}")

        if game_summary:
            parts.append(f"Game review summary:\n{game_summary}")

        if mode:
            parts.append(f"Coaching mode: {mode.value}")

        if analysis:
            eval_str = self._format_evaluation(analysis)
            parts.append(f"Engine evaluation: {eval_str}")
            if analysis.best_move:
                parts.append(f"Engine best move: {analysis.best_move}")
            if analysis.principal_variation:
                pv = " ".join(analysis.principal_variation[:8])
                parts.append(f"Principal variation: {pv}")

        return "\n".join(parts)

    @staticmethod
    def _format_evaluation(analysis: AnalysisResult) -> str:
        if analysis.mate_in is not None:
            if analysis.mate_in > 0:
                return f"White is winning (mate in {analysis.mate_in})"
            return f"Black is winning (mate in {abs(analysis.mate_in)})"
        if analysis.evaluation > 0:
            return f"+{analysis.evaluation:.2f} (White is better)"
        if analysis.evaluation < 0:
            return f"{analysis.evaluation:.2f} (Black is better)"
        return "Equal position"
