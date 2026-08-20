import io
import json
from dataclasses import dataclass

import chess
import chess.pgn

from app.llm.base import LLMMessage
from app.llm.factory import get_llm_provider
from app.services.move_classifier import MoveClassification
from app.repositories.analysis_repository import MoveAnalysisRecord


COACHING_BATCH_PROMPT = """You are Checkmate, an expert chess coach reviewing a student's game.

You will receive a JSON array of important moves with engine data. For EACH move, return coaching in structured JSON.

Personality: encouraging, honest, concise, educational. Compliment good moves briefly. Explain mistakes clearly.

Rules:
- Use ONLY the engine data provided. Do not invent chess facts.
- suggested_move must match the engine best_move_san when provided for mistakes.
- For good moves, suggested_move should be null.
- Keep explanations to 2-3 sentences max.

Return JSON exactly in this format:
{
  "moves": [
    {
      "move_index": 12,
      "classification": "MISTAKE",
      "headline": "Short headline",
      "explanation": "...",
      "teaching_point": "...",
      "encouragement": null,
      "suggested_move_san": "Nf6",
      "suggested_line": "Nf6 Be7 O-O"
    }
  ]
}
"""

SUMMARY_PROMPT = """You are Checkmate, a chess coach. Write a brief game review summary (3-5 sentences).

Include:
- Overall performance assessment
- Biggest turning point
- Strongest moment
- One focus area for future games

Be encouraging but honest. Use the provided critical moments data only.

Return JSON:
{
  "summary": "..."
}
"""


@dataclass
class CoachingOutput:
    move_index: int
    headline: str
    explanation: str
    teaching_point: str | None
    encouragement: str | None
    suggested_move_san: str | None
    suggested_line: str | None


class CoachingGenerator:
    def __init__(self, llm=None) -> None:
        self._llm = llm

    def _get_llm(self):
        return self._llm or get_llm_provider()

    async def generate_coaching_batch(
        self,
        moves: list[MoveAnalysisRecord],
        player_username: str,
    ) -> list[CoachingOutput]:
        if not moves:
            return []

        payload = []
        for m in moves:
            payload.append({
                "move_index": m.move_index,
                "move_number": m.move_number,
                "side": m.side,
                "san": m.san,
                "classification": m.classification,
                "evaluation_before": m.evaluation_before,
                "evaluation_after": m.evaluation_after,
                "best_move_san": m.best_move_san,
                "centipawn_loss": m.centipawn_loss,
                "principal_variation": m.principal_variation[:5],
                "player": player_username,
            })

        llm = self._get_llm()
        try:
            response = await llm.chat([
                LLMMessage(role="system", content=COACHING_BATCH_PROMPT),
                LLMMessage(role="user", content=json.dumps(payload)),
            ], temperature=0.5)
            data = json.loads(response.content)
            results = []
            for item in data.get("moves", []):
                results.append(CoachingOutput(
                    move_index=item["move_index"],
                    headline=item.get("headline", ""),
                    explanation=item.get("explanation", ""),
                    teaching_point=item.get("teaching_point"),
                    encouragement=item.get("encouragement"),
                    suggested_move_san=item.get("suggested_move_san"),
                    suggested_line=item.get("suggested_line"),
                ))
            return results
        except (json.JSONDecodeError, KeyError, TypeError):
            return self._fallback_coaching(moves)

    async def generate_summary(
        self,
        player_username: str,
        opponent_username: str | None,
        result: str,
        critical_moves: list[MoveAnalysisRecord],
        white_accuracy: float,
        black_accuracy: float,
    ) -> str:
        payload = {
            "player": player_username,
            "opponent": opponent_username,
            "result": result,
            "white_accuracy": white_accuracy,
            "black_accuracy": black_accuracy,
            "critical_moments": [
                {
                    "move_index": m.move_index,
                    "san": m.san,
                    "classification": m.classification,
                    "centipawn_loss": m.centipawn_loss,
                }
                for m in critical_moves[:10]
            ],
        }
        llm = self._get_llm()
        try:
            response = await llm.chat([
                LLMMessage(role="system", content=SUMMARY_PROMPT),
                LLMMessage(role="user", content=json.dumps(payload)),
            ], temperature=0.6)
            data = json.loads(response.content)
            return data.get("summary", self._fallback_summary(critical_moves))
        except (json.JSONDecodeError, KeyError, RuntimeError):
            return self._fallback_summary(critical_moves)

    @staticmethod
    def _fallback_coaching(moves: list[MoveAnalysisRecord]) -> list[CoachingOutput]:
        results = []
        for m in moves:
            if m.classification in (
                MoveClassification.GOOD.value,
                MoveClassification.BOOK.value,
                MoveClassification.FORCED.value,
            ):
                headline = "Solid move"
                explanation = "This move keeps the position reasonable according to the engine."
                encouragement = "Nice and practical." if m.centipawn_loss < 20 else None
            else:
                headline = f"{m.classification.title()} — engine disagrees"
                explanation = (
                    f"The engine suggests {m.best_move_san or 'a different move'} was stronger here."
                )
                encouragement = None
            results.append(CoachingOutput(
                move_index=m.move_index,
                headline=headline,
                explanation=explanation,
                teaching_point="Compare your move with the engine's top choice.",
                encouragement=encouragement,
                suggested_move_san=m.best_move_san if m.classification not in (
                    MoveClassification.GOOD.value,
                    MoveClassification.GREAT.value,
                    MoveClassification.BRILLIANT.value,
                ) else None,
                suggested_line=" ".join(m.principal_variation[:4]) if m.principal_variation else None,
            ))
        return results

    @staticmethod
    def _fallback_summary(critical_moves: list[MoveAnalysisRecord]) -> str:
        mistakes = sum(
            1 for m in critical_moves
            if m.classification in (
                MoveClassification.MISTAKE.value,
                MoveClassification.BLUNDER.value,
            )
        )
        return (
            f"Game review complete. The engine flagged {len(critical_moves)} important moments"
            f" including {mistakes} significant errors. Step through the highlighted moves "
            "to see where the evaluation shifted."
        )


def validate_suggested_move(fen: str, san: str | None) -> str | None:
    if not san:
        return None
    board = chess.Board(fen)
    try:
        move = board.parse_san(san)
        return board.san(move)
    except ValueError:
        return None
