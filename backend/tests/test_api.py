import os
import shutil

import pytest

from app.chess.fen import InvalidFenError, validate_fen

STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
INVALID_FEN = "not-a-fen"

STOCKFISH_AVAILABLE = shutil.which(
    os.environ.get("STOCKFISH_PATH", "/usr/games/stockfish")
) is not None or shutil.which("stockfish") is not None


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "checkmate-backend"


def test_validate_fen_valid():
    board = validate_fen(STARTING_FEN)
    assert board.fen() == STARTING_FEN


def test_validate_fen_invalid():
    with pytest.raises(InvalidFenError):
        validate_fen(INVALID_FEN)


@pytest.mark.asyncio
async def test_analyze_invalid_fen(client):
    response = await client.post(
        "/api/chess/analyze",
        json={"fen": INVALID_FEN, "depth": 10},
    )
    assert response.status_code == 400
    assert "Invalid FEN" in response.json()["detail"]


@pytest.mark.asyncio
@pytest.mark.skipif(not STOCKFISH_AVAILABLE, reason="Stockfish not installed")
async def test_analyze_starting_position(client):
    response = await client.post(
        "/api/chess/analyze",
        json={"fen": STARTING_FEN, "depth": 8},
    )
    assert response.status_code == 200
    data = response.json()
    assert "evaluation" in data
    assert "best_move" in data
    assert isinstance(data["principal_variation"], list)
    assert data["depth"] >= 1


@pytest.mark.asyncio
async def test_coach_chat_invalid_fen(client):
    response = await client.post(
        "/api/coach/chat",
        json={
            "message": "What should I play?",
            "fen": INVALID_FEN,
            "move_history": [],
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_coach_chat_missing_api_key(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    from app.config import settings

    settings.openai_api_key = ""

    response = await client.post(
        "/api/coach/chat",
        json={
            "message": "What should I play?",
            "fen": STARTING_FEN,
            "move_history": [],
        },
    )
    assert response.status_code == 503
    assert "API key" in response.json()["detail"]


@pytest.mark.asyncio
async def test_coach_chat_invalid_mode(client):
    response = await client.post(
        "/api/coach/chat",
        json={
            "message": "Hello",
            "fen": STARTING_FEN,
            "move_history": [],
            "mode": "invalid_mode",
        },
    )
    assert response.status_code == 400
    assert "Invalid coaching mode" in response.json()["detail"]
