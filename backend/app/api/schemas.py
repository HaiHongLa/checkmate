from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    fen: str = Field(..., description="FEN string of the position to analyze")
    depth: int = Field(default=15, ge=1, le=30, description="Search depth")


class AnalyzeResponse(BaseModel):
    evaluation: float
    best_move: str
    principal_variation: list[str]
    depth: int
    mate_in: int | None = None


class CoachChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    fen: str
    move_history: list[str] = Field(default_factory=list)
    pgn: str | None = Field(default=None, description="Full game PGN for imported games")
    current_move: int | None = Field(default=None, description="Current move number in imported game")
    saved_move_analysis: dict | None = Field(default=None, description="Saved analysis for current move")
    game_summary: str | None = Field(default=None, description="Saved game review summary")
    mode: str | None = Field(
        default=None,
        description="Optional coaching mode (explain, hint, quiz, analyze, practice, play)",
    )
    include_analysis: bool = Field(default=True)


class CoachChatResponse(BaseModel):
    response: str
    analysis: AnalyzeResponse | None = None


class ErrorResponse(BaseModel):
    detail: str


class ChessComGameResponse(BaseModel):
    id: str
    date: str
    white: str
    black: str
    result: str
    time_control: str | None = None
    pgn: str
    url: str
    opening: str | None = None
    user_color: str | None = None


class ChessComGamesResponse(BaseModel):
    username: str
    games: list[ChessComGameResponse]


class CreateGameAnalysisRequest(BaseModel):
    source: str = "chesscom"
    source_game_id: str
    player_username: str
    opponent_username: str | None = None
    pgn: str
    force: bool = False


class MoveAnalysisResponse(BaseModel):
    move_index: int
    move_number: int
    side: str
    san: str
    uci: str
    fen_before: str
    fen_after: str
    evaluation_before: float | None = None
    evaluation_after: float | None = None
    best_move: str | None = None
    best_move_san: str | None = None
    principal_variation: list[str] = Field(default_factory=list)
    centipawn_loss: float = 0
    classification: str
    is_critical: bool = False
    coaching_headline: str | None = None
    coaching_explanation: str | None = None
    coaching_teaching_point: str | None = None
    coaching_encouragement: str | None = None
    suggested_move: str | None = None
    suggested_move_san: str | None = None
    suggested_line: str | None = None
    coaching_generated: bool = False


class GameAnalysisResponse(BaseModel):
    game_id: str
    source: str
    source_game_id: str
    player_username: str
    opponent_username: str | None = None
    status: str
    summary: str | None = None
    white_accuracy: float | None = None
    black_accuracy: float | None = None
    white_game_rating: float | None = None
    black_game_rating: float | None = None
    engine_version: str | None = None
    engine_depth: int | None = None
    analysis_version: str = "v1"
    generated_at: str | None = None
    progress_message: str | None = None
    progress_current: int = 0
    progress_total: int = 0
    error_message: str | None = None
    moves: list[MoveAnalysisResponse] = Field(default_factory=list)


class GameAnalysisStatusResponse(BaseModel):
    game_id: str
    status: str
    progress_message: str | None = None
    progress_current: int = 0
    progress_total: int = 0
    error_message: str | None = None
    generated_at: str | None = None


class CreateRepertoireRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    color: str = Field(..., pattern="^(white|black)$")


class UpdateRepertoireRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class RepertoireResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: str
    updated_at: str


class CreateLineRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class UpdateLineRequest(BaseModel):
    name: str | None = None
    record_practice: bool = False


class MoveInput(BaseModel):
    san: str


class ReplaceLineMovesRequest(BaseModel):
    moves: list[MoveInput] = Field(default_factory=list)


class PlyResponse(BaseModel):
    ply_index: int
    san: str
    uci: str
    fen_after: str
    is_key_position: bool


class ExplanationResponse(BaseModel):
    ply_index: int
    why_move: str | None = None
    strategic_idea: str | None = None
    plan_text: str | None = None
    watch_for: str | None = None
    remember_this: str | None = None
    content_version: str = "v1"
    generated_at: str | None = None


class LineDetailResponse(BaseModel):
    id: str
    repertoire_id: str
    name: str
    created_at: str
    updated_at: str
    last_practiced_at: str | None = None
    practice_attempt_count: int = 0
    plies: list[PlyResponse] = Field(default_factory=list)
    explanations: list[ExplanationResponse] = Field(default_factory=list)


class LineSummaryResponse(BaseModel):
    id: str
    repertoire_id: str
    name: str
    created_at: str
    updated_at: str
    last_practiced_at: str | None = None
    practice_attempt_count: int = 0
    move_count: int = 0


class KeyPositionRequest(BaseModel):
    is_key: bool


class GenerateExplanationsRequest(BaseModel):
    ply_indices: list[int] | None = None

