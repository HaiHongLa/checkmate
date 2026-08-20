from fastapi import APIRouter, HTTPException, Request

from app.api.schemas import AnalyzeResponse, CoachChatRequest, CoachChatResponse
from app.chess.fen import InvalidFenError
from app.services.coach import CoachService
from app.services.coach_prompt import CoachMode
from app.services.stockfish import StockfishService

router = APIRouter(prefix="/api/coach", tags=["coach"])


def _parse_mode(mode: str | None) -> CoachMode | None:
    if not mode:
        return None
    try:
        return CoachMode(mode.lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid coaching mode: {mode}. Valid modes: {[m.value for m in CoachMode]}",
        ) from exc


@router.post("/chat", response_model=CoachChatResponse)
async def coach_chat(
    body: CoachChatRequest,
    request: Request,
) -> CoachChatResponse:
    stockfish: StockfishService = request.app.state.stockfish
    coach = CoachService(stockfish=stockfish)
    mode = _parse_mode(body.mode)

    try:
        response_text, analysis = await coach.chat(
            message=body.message,
            fen=body.fen,
            move_history=body.move_history,
            mode=mode,
            include_analysis=body.include_analysis,
            pgn=body.pgn,
            current_move=body.current_move,
            saved_move_analysis=body.saved_move_analysis,
            game_summary=body.game_summary,
        )
    except InvalidFenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    analysis_response = None
    if analysis:
        analysis_response = AnalyzeResponse(
            evaluation=analysis.evaluation,
            best_move=analysis.best_move,
            principal_variation=analysis.principal_variation,
            depth=analysis.depth,
            mate_in=analysis.mate_in,
        )

    return CoachChatResponse(response=response_text, analysis=analysis_response)
