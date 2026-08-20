from app.repositories.analysis_repository import AnalysisRepository, make_game_id
from app.services.move_classifier import AnalysisStatus


SAMPLE_PGN = """[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0
"""


def test_make_game_id():
    assert make_game_id("chesscom", "abc123") == "chesscom:abc123"


def test_upsert_and_get_game():
    repo = AnalysisRepository()
    game_id = make_game_id("chesscom", "test-game-1")
    repo.upsert_game(
        game_id=game_id,
        source="chesscom",
        source_game_id="test-game-1",
        player_username="Alice",
        opponent_username="Bob",
        pgn=SAMPLE_PGN,
        status=AnalysisStatus.NOT_ANALYZED.value,
    )
    game = repo.get_game(game_id)
    assert game is not None
    assert game.player_username == "Alice"
    assert game.pgn == SAMPLE_PGN


def test_delete_analysis():
    repo = AnalysisRepository()
    game_id = make_game_id("chesscom", "test-game-2")
    repo.upsert_game(
        game_id=game_id,
        source="chesscom",
        source_game_id="test-game-2",
        player_username="Alice",
        opponent_username="Bob",
        pgn=SAMPLE_PGN,
    )
    repo.update_status(game_id, AnalysisStatus.COMPLETE.value)
    repo.delete_analysis(game_id)
    game = repo.get_game(game_id)
    assert game is not None
    assert game.status == AnalysisStatus.NOT_ANALYZED.value
    assert repo.get_moves(game_id) == []
