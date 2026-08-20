import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.analysis_repository import AnalysisRepository, make_game_id
from app.services.coaching_generator import CoachingGenerator, validate_suggested_move
from app.services.move_classifier import AnalysisStatus

SAMPLE_PGN = """[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0
"""

START_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


@pytest.mark.asyncio
async def test_create_analysis_starts_job(client):
    game_id = make_game_id("chesscom", "api-test-1")
    mock_analyzer = MagicMock()
    mock_analyzer.run_analysis = AsyncMock()

    with patch("app.api.game_analysis._get_analyzer", return_value=mock_analyzer):
        response = await client.post(
            "/api/games/analysis",
            json={
                "source": "chesscom",
                "source_game_id": "api-test-1",
                "player_username": "Alice",
                "opponent_username": "Bob",
                "pgn": SAMPLE_PGN,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["game_id"] == game_id
    assert data["status"] in (
        AnalysisStatus.QUEUED.value,
        AnalysisStatus.ANALYZING.value,
    )


@pytest.mark.asyncio
async def test_get_analysis_not_found(client):
    response = await client.get("/api/games/chesscom:missing/analysis")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_analysis_after_create(client):
    repo = AnalysisRepository()
    game_id = make_game_id("chesscom", "api-test-2")
    repo.upsert_game(
        game_id=game_id,
        source="chesscom",
        source_game_id="api-test-2",
        player_username="Alice",
        opponent_username="Bob",
        pgn=SAMPLE_PGN,
        status=AnalysisStatus.COMPLETE.value,
    )
    repo.complete_analysis(
        game_id,
        summary="Solid game.",
        white_accuracy=85.0,
        black_accuracy=80.0,
        white_game_rating=1400,
        black_game_rating=1350,
        engine_version="stockfish",
        engine_depth=16,
    )

    response = await client.get(f"/api/games/{game_id}/analysis")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == AnalysisStatus.COMPLETE.value
    assert data["summary"] == "Solid game."


def test_validate_suggested_move():
    assert validate_suggested_move(START_FEN, "Nf6") == "Nf6"
    assert validate_suggested_move(START_FEN, "invalid") is None


@pytest.mark.asyncio
async def test_coaching_generator_fallback():
    from app.repositories.analysis_repository import MoveAnalysisRecord

    moves = [
        MoveAnalysisRecord(
            move_index=2,
            move_number=1,
            side="black",
            san="e5",
            uci="e7e5",
            fen_before=START_FEN,
            fen_after=START_FEN,
            evaluation_before=0.2,
            evaluation_after=0.1,
            best_move="g8f6",
            best_move_san="Nf6",
            principal_variation=["Nf6"],
            centipawn_loss=80,
            classification="MISTAKE",
            is_critical=True,
        )
    ]
    llm = MagicMock()
    llm.chat = AsyncMock(return_value=MagicMock(content="not json"))
    generator = CoachingGenerator(llm=llm)
    results = await generator.generate_coaching_batch(moves, "Alice")
    assert len(results) == 1
    assert results[0].move_index == 2
    assert "engine" in results[0].explanation.lower()
