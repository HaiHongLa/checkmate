import asyncio
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.api.schemas import (
    CreateGameAnalysisRequest,
    GameAnalysisResponse,
    GameAnalysisStatusResponse,
    MoveAnalysisResponse,
)
from app.repositories.analysis_repository import AnalysisRepository, make_game_id
from app.services.game_analyzer import GameAnalyzerService
from app.services.move_classifier import AnalysisStatus
from app.services.stockfish import StockfishService

router = APIRouter(prefix="/api/games", tags=["game-analysis"])

# In-process task registry for V1
_running_tasks: dict[str, asyncio.Task] = {}


def _get_repo() -> AnalysisRepository:
    return AnalysisRepository()


def _get_analyzer(request: Request) -> GameAnalyzerService:
    stockfish: StockfishService = request.app.state.stockfish
    return GameAnalyzerService(stockfish)


def _move_to_response(m) -> MoveAnalysisResponse:
    return MoveAnalysisResponse(
        move_index=m.move_index,
        move_number=m.move_number,
        side=m.side,
        san=m.san,
        uci=m.uci,
        fen_before=m.fen_before,
        fen_after=m.fen_after,
        evaluation_before=m.evaluation_before,
        evaluation_after=m.evaluation_after,
        best_move=m.best_move,
        best_move_san=m.best_move_san,
        principal_variation=m.principal_variation,
        centipawn_loss=m.centipawn_loss,
        classification=m.classification,
        is_critical=m.is_critical,
        coaching_headline=m.coaching_headline,
        coaching_explanation=m.coaching_explanation,
        coaching_teaching_point=m.coaching_teaching_point,
        coaching_encouragement=m.coaching_encouragement,
        suggested_move=m.suggested_move,
        suggested_move_san=m.suggested_move_san,
        suggested_line=m.suggested_line,
        coaching_generated=m.coaching_generated,
    )


def _game_to_response(game, moves) -> GameAnalysisResponse:
    return GameAnalysisResponse(
        game_id=game.game_id,
        source=game.source,
        source_game_id=game.source_game_id,
        player_username=game.player_username,
        opponent_username=game.opponent_username,
        status=game.status,
        summary=game.summary,
        white_accuracy=game.white_accuracy,
        black_accuracy=game.black_accuracy,
        white_game_rating=game.white_game_rating,
        black_game_rating=game.black_game_rating,
        engine_version=game.engine_version,
        engine_depth=game.engine_depth,
        analysis_version=game.analysis_version,
        generated_at=game.generated_at,
        progress_message=game.progress_message,
        progress_current=game.progress_current,
        progress_total=game.progress_total,
        error_message=game.error_message,
        moves=[_move_to_response(m) for m in moves],
    )


async def _run_analysis_task(game_id: str, request: Request) -> None:
    analyzer = _get_analyzer(request)
    try:
        await analyzer.run_analysis(game_id)
    finally:
        _running_tasks.pop(game_id, None)


@router.get("/{game_id}/analysis", response_model=GameAnalysisResponse)
async def get_analysis(game_id: str) -> GameAnalysisResponse:
    repo = _get_repo()
    game = repo.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    moves = repo.get_moves(game_id)
    return _game_to_response(game, moves)


@router.get("/{game_id}/analysis/status", response_model=GameAnalysisStatusResponse)
async def get_analysis_status(game_id: str) -> GameAnalysisStatusResponse:
    repo = _get_repo()
    game = repo.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return GameAnalysisStatusResponse(
        game_id=game_id,
        status=game.status,
        progress_message=game.progress_message,
        progress_current=game.progress_current,
        progress_total=game.progress_total,
        error_message=game.error_message,
        generated_at=game.generated_at,
    )


@router.post("/analysis", response_model=GameAnalysisResponse)
async def create_or_get_analysis(
    body: CreateGameAnalysisRequest,
    request: Request,
    background_tasks: BackgroundTasks,
) -> GameAnalysisResponse:
    game_id = make_game_id(body.source, body.source_game_id)
    repo = _get_repo()
    existing = repo.get_game(game_id)

    if existing and existing.status == AnalysisStatus.COMPLETE.value and not body.force:
        moves = repo.get_moves(game_id)
        return _game_to_response(existing, moves)

    if existing and existing.status in (
        AnalysisStatus.ANALYZING.value,
        AnalysisStatus.GENERATING_COACHING.value,
        AnalysisStatus.QUEUED.value,
    ) and not body.force:
        moves = repo.get_moves(game_id)
        return _game_to_response(existing, moves)

    if body.force and existing:
        repo.delete_analysis(game_id)

    game = repo.upsert_game(
        game_id=game_id,
        source=body.source,
        source_game_id=body.source_game_id,
        player_username=body.player_username,
        opponent_username=body.opponent_username,
        pgn=body.pgn,
        status=AnalysisStatus.QUEUED.value,
    )
    repo.update_status(
        game_id,
        AnalysisStatus.QUEUED.value,
        progress_message="Queued for analysis...",
    )

    if game_id not in _running_tasks:
        task = asyncio.create_task(_run_analysis_task(game_id, request))
        _running_tasks[game_id] = task

    moves = repo.get_moves(game_id)
    return _game_to_response(game, moves)


@router.delete("/{game_id}/analysis")
async def delete_analysis(game_id: str) -> dict[str, str]:
    repo = _get_repo()
    game = repo.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    task = _running_tasks.pop(game_id, None)
    if task:
        task.cancel()
    repo.delete_analysis(game_id)
    return {"detail": "Analysis deleted. You can re-analyze the game."}
