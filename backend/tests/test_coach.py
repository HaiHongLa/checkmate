import pytest

from app.llm.base import LLMMessage, LLMResponse
from app.services.coach import CoachService
from app.services.coach_prompt import CoachMode
from app.services.stockfish import AnalysisResult


class MockLLM:
    def __init__(self, response: str = "Great question! Consider developing your pieces.") -> None:
        self._response = response
        self.last_messages: list[LLMMessage] = []

    async def chat(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.7,
    ) -> LLMResponse:
        self.last_messages = messages
        return LLMResponse(content=self._response, model="mock")


class MockStockfish:
    async def analyze(self, fen: str, depth: int = 15) -> AnalysisResult:
        return AnalysisResult(
            evaluation=0.5,
            best_move="Nf3",
            principal_variation=["Nf3", "Nc6", "Bb5"],
            depth=depth,
            mate_in=None,
        )


STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.mark.asyncio
async def test_coach_includes_engine_context():
    llm = MockLLM()
    stockfish = MockStockfish()
    coach = CoachService(llm_provider=llm, stockfish=stockfish)

    response, analysis = await coach.chat(
        message="What should I play?",
        fen=STARTING_FEN,
        move_history=["e4", "e5"],
        mode=CoachMode.EXPLAIN,
    )

    assert "Great question" in response
    assert analysis is not None
    assert analysis.best_move == "Nf3"
    assert len(llm.last_messages) == 2
    assert llm.last_messages[0].role == "system"
    user_content = llm.last_messages[1].content
    assert STARTING_FEN in user_content
    assert "e4, e5" in user_content
    assert "Engine best move: Nf3" in user_content


@pytest.mark.asyncio
async def test_coach_without_analysis():
    llm = MockLLM("Think about piece development.")
    coach = CoachService(llm_provider=llm, stockfish=None)

    response, analysis = await coach.chat(
        message="Any tips?",
        fen=STARTING_FEN,
        move_history=[],
        include_analysis=False,
    )

    assert analysis is None
    assert "piece development" in response
