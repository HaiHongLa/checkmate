from fastapi import APIRouter, HTTPException, Request

from app.api.schemas import AnalyzeRequest, AnalyzeResponse
from app.chess.fen import InvalidFenError
from app.services.stockfish import StockfishService

router = APIRouter(prefix="/api/chess", tags=["chess"])


def get_stockfish(request: Request) -> StockfishService:
    return request.app.state.stockfish


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_position(
    body: AnalyzeRequest,
    request: Request,
) -> AnalyzeResponse:
    stockfish: StockfishService = get_stockfish(request)

    try:
        result = await stockfish.analyze(body.fen, depth=body.depth)
    except InvalidFenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AnalyzeResponse(
        evaluation=result.evaluation,
        best_move=result.best_move,
        principal_variation=result.principal_variation,
        depth=result.depth,
        mate_in=result.mate_in,
    )
