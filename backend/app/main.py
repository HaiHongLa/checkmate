from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chess import router as chess_router
from app.api.chesscom import router as chesscom_router
from app.api.coach import router as coach_router
from app.api.game_analysis import router as game_analysis_router
from app.api.opening_lab import router as opening_lab_router
from app.config import settings
from app.db.database import init_db
from app.services.stockfish import StockfishService


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    stockfish = StockfishService(settings.stockfish_path)
    app.state.stockfish = stockfish
    yield
    stockfish.close()


app = FastAPI(
    title="Checkmate API",
    description="AI-powered chess coaching backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chess_router)
app.include_router(chesscom_router)
app.include_router(coach_router)
app.include_router(game_analysis_router)
app.include_router(opening_lab_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "checkmate-backend"}
