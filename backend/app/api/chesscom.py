import io

import chess.pgn
from fastapi import APIRouter, HTTPException, Query

from app.api.schemas import ChessComGameResponse, ChessComGamesResponse
from app.services.chesscom import (
    ChessComError,
    ChessComService,
    ChessComUserNotFoundError,
    validate_username,
)

router = APIRouter(prefix="/api/chesscom", tags=["chesscom"])


def _get_service() -> ChessComService:
    return ChessComService()


@router.get("/{username}/games", response_model=ChessComGamesResponse)
async def get_user_games(
    username: str,
    limit: int = Query(default=20, ge=1, le=50),
) -> ChessComGamesResponse:
    try:
        validate_username(username)
    except ChessComError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    service = _get_service()
    try:
        player, games = await service.fetch_recent_games(username, limit=limit)
    except ChessComUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ChessComError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    finally:
        await service.close()

    if not games:
        raise HTTPException(
            status_code=404,
            detail=f"No games found for '{player.display_username}'.",
        )

    return ChessComGamesResponse(
        username=player.display_username,
        games=[
            ChessComGameResponse(
                id=game.id,
                date=game.date,
                white=game.white,
                black=game.black,
                result=game.result,
                time_control=game.time_control,
                pgn=game.pgn,
                url=game.url,
                opening=game.opening,
                user_color=game.user_color,
            )
            for game in games
        ],
    )


@router.post("/parse-pgn")
async def parse_pgn(body: dict) -> dict:
    pgn = body.get("pgn", "")
    if not pgn or not isinstance(pgn, str):
        raise HTTPException(status_code=400, detail="PGN is required.")

    try:
        game = chess.pgn.read_game(io.StringIO(pgn))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid PGN: {exc}") from exc

    if game is None:
        raise HTTPException(status_code=400, detail="Could not parse PGN.")

    board = game.board()
    moves: list[str] = []
    for move in game.mainline_moves():
        moves.append(board.san(move))
        board.push(move)

    headers = game.headers
    return {
        "moves": moves,
        "white": headers.get("White"),
        "black": headers.get("Black"),
        "result": headers.get("Result"),
        "opening": headers.get("Opening") or headers.get("ECO"),
        "date": headers.get("Date"),
    }
