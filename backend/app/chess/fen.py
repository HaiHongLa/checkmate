import chess


class InvalidFenError(ValueError):
    """Raised when a FEN string is invalid."""


def validate_fen(fen: str) -> chess.Board:
    """Validate and parse a FEN string, returning a chess.Board."""
    try:
        board = chess.Board(fen)
    except ValueError as exc:
        raise InvalidFenError(f"Invalid FEN: {exc}") from exc

    if board.status() != chess.STATUS_VALID:
        raise InvalidFenError("FEN describes an invalid chess position.")

    return board
