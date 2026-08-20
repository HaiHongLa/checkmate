import pytest

from app.services.chesscom import (
    ChessComError,
    ChessComService,
    validate_username,
    _normalize_game,
)

SAMPLE_GAME = {
    "url": "https://www.chess.com/game/live/123456789",
    "pgn": '[Event "Live Chess"]\n[White "HaiLa"]\n[Black "Opponent"]\n[Result "1-0"]\n[Opening "Sicilian Defense"]\n\n1. e4 c5 2. Nf3 d6 1-0',
    "time_control": "180",
    "end_time": 1692403200,
    "white": {"username": "HaiLa", "rating": 1200},
    "black": {"username": "Opponent", "rating": 1180},
    "result": "1-0",
}


def test_validate_username_valid():
    assert validate_username("HaiLa") == "HaiLa"
    assert validate_username("  player_123  ") == "player_123"


def test_validate_username_invalid():
    with pytest.raises(ChessComError) as exc:
        validate_username("ab")
    assert exc.value.status_code == 400

    with pytest.raises(ChessComError):
        validate_username("bad name!")


def test_normalize_game():
    game = _normalize_game(SAMPLE_GAME, "HaiLa")
    assert game is not None
    assert game.white == "HaiLa"
    assert game.black == "Opponent"
    assert game.result == "1-0"
    assert game.time_control == "Blitz"
    assert game.user_color == "white"
    assert game.opening == "Sicilian Defense"
    assert "e4" in game.pgn


def test_normalize_game_missing_pgn():
    assert _normalize_game({"url": "x"}, "HaiLa") is None


def test_display_username_from_profile():
    from app.services.chesscom import _display_username_from_profile

    data = {
        "username": "lhhai",
        "url": "https://www.chess.com/member/LHHai",
    }
    assert _display_username_from_profile(data, "LHHai") == "LHHai"


@pytest.mark.asyncio
async def test_chesscom_games_user_not_found(client, monkeypatch):
    async def mock_fetch(*args, **kwargs):
        from app.services.chesscom import ChessComUserNotFoundError
        raise ChessComUserNotFoundError("missinguser")

    monkeypatch.setattr(
        ChessComService, "fetch_recent_games", mock_fetch
    )

    response = await client.get("/api/chesscom/missinguser/games")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chesscom_games_success(client, monkeypatch):
    from app.services.chesscom import ChessComGame, ChessComPlayer

    async def mock_fetch(self, username, *, limit=20):
        return (
            ChessComPlayer(canonical_username="lhhai", display_username="LHHai"),
            [
            ChessComGame(
                id="123456789",
                date="Aug 19, 2024",
                white="LHHai",
                black="Opponent",
                result="1-0",
                time_control="Blitz",
                pgn=SAMPLE_GAME["pgn"],
                url=SAMPLE_GAME["url"],
                opening="Sicilian Defense",
                user_color="white",
            )
        ],
        )

    monkeypatch.setattr(ChessComService, "fetch_recent_games", mock_fetch)

    response = await client.get("/api/chesscom/LHHai/games")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "LHHai"
    assert len(data["games"]) == 1
    assert data["games"][0]["white"] == "LHHai"


@pytest.mark.asyncio
async def test_chesscom_invalid_username(client):
    response = await client.get("/api/chesscom/bad!/games")
    assert response.status_code == 400
