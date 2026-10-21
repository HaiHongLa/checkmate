import json

from pydantic import BaseModel, Field, ValidationError

from app.llm.base import LLMMessage
from app.llm.factory import get_llm_provider
from app.repositories.opening_repository import PlyRecord


OPENING_LEARN_PROMPT = """You are Checkmate, an expert opening coach.

You receive JSON for repertoire positions. For each position, return teaching content.

Rules:
- Use only the provided chess data. Do not invent engine evaluations.
- Be clear, encouraging, and concise (2-3 sentences per field max).
- "remember_this" must be a short memory hook (under 15 words).
- Analogies are optional; if used, tie them to the chess idea.

Return JSON:
{
  "positions": [
    {
      "ply_index": 3,
      "why_move": "...",
      "strategic_idea": "...",
      "plan_text": "...",
      "watch_for": "...",
      "remember_this": "..."
    }
  ]
}
"""


class LearnExplanationItem(BaseModel):
    ply_index: int
    why_move: str = Field(min_length=1)
    strategic_idea: str = Field(min_length=1)
    plan_text: str = Field(min_length=1)
    watch_for: str = Field(min_length=1)
    remember_this: str = Field(min_length=1)


class LearnBatchResponse(BaseModel):
    positions: list[LearnExplanationItem]


class OpeningCoachGenerator:
    def __init__(self, llm=None) -> None:
        self._llm = llm

    def _get_llm(self):
        return self._llm or get_llm_provider()

    async def generate_batch(
        self,
        repertoire_name: str,
        color: str,
        teach_plies: list[PlyRecord],
        all_sans: list[str],
    ) -> list[LearnExplanationItem]:
        if not teach_plies:
            return []

        payload = []
        for p in teach_plies:
            history = all_sans[: p.ply_index - 1]
            payload.append({
                "ply_index": p.ply_index,
                "san": p.san,
                "fen_after": p.fen_after,
                "move_history": history,
                "repertoire": repertoire_name,
                "color": color,
            })

        llm = self._get_llm()
        try:
            response = await llm.chat([
                LLMMessage(role="system", content=OPENING_LEARN_PROMPT),
                LLMMessage(role="user", content=json.dumps(payload)),
            ], temperature=0.5)
            data = json.loads(response.content)
            parsed = LearnBatchResponse.model_validate(data)
            return parsed.positions
        except (json.JSONDecodeError, ValidationError, RuntimeError):
            return self._fallback(teach_plies)

    @staticmethod
    def _fallback(plies: list[PlyRecord]) -> list[LearnExplanationItem]:
        items = []
        for p in plies:
            items.append(
                LearnExplanationItem(
                    ply_index=p.ply_index,
                    why_move=f"{p.san} is part of your prepared line in this position.",
                    strategic_idea="Follow the plans you chose when building this repertoire.",
                    plan_text="Develop pieces harmoniously and keep your king safe.",
                    watch_for="Your opponent's tactical threats and tempo-gaining moves.",
                    remember_this=f"Know your {p.san} idea here.",
                )
            )
        return items
