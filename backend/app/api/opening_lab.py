from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    CreateLineRequest,
    CreateRepertoireRequest,
    ExplanationResponse,
    GenerateExplanationsRequest,
    KeyPositionRequest,
    LineDetailResponse,
    LineSummaryResponse,
    PlyResponse,
    ReplaceLineMovesRequest,
    RepertoireResponse,
    UpdateLineRequest,
    UpdateRepertoireRequest,
)
from app.repositories.opening_repository import OpeningRepository
from app.services.opening_coach import OpeningCoachGenerator

router = APIRouter(prefix="/api/openings", tags=["opening-lab"])


def _repo() -> OpeningRepository:
    return OpeningRepository()


def _repertoire_response(r) -> RepertoireResponse:
    return RepertoireResponse(
        id=r.id,
        name=r.name,
        color=r.color,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _line_detail(line, plies, explanations) -> LineDetailResponse:
    return LineDetailResponse(
        id=line.id,
        repertoire_id=line.repertoire_id,
        name=line.name,
        created_at=line.created_at,
        updated_at=line.updated_at,
        last_practiced_at=line.last_practiced_at,
        practice_attempt_count=line.practice_attempt_count,
        plies=[
            PlyResponse(
                ply_index=p.ply_index,
                san=p.san,
                uci=p.uci,
                fen_after=p.fen_after,
                is_key_position=p.is_key_position,
            )
            for p in plies
        ],
        explanations=[
            ExplanationResponse(
                ply_index=e.ply_index,
                why_move=e.why_move,
                strategic_idea=e.strategic_idea,
                plan_text=e.plan_text,
                watch_for=e.watch_for,
                remember_this=e.remember_this,
                content_version=e.content_version,
                generated_at=e.generated_at,
            )
            for e in explanations
        ],
    )


@router.get("/repertoires", response_model=list[RepertoireResponse])
async def list_repertoires() -> list[RepertoireResponse]:
    return [_repertoire_response(r) for r in _repo().list_repertoires()]


@router.post("/repertoires", response_model=RepertoireResponse)
async def create_repertoire(body: CreateRepertoireRequest) -> RepertoireResponse:
    r = _repo().create_repertoire(body.name, body.color)
    return _repertoire_response(r)


@router.get("/repertoires/{repertoire_id}", response_model=RepertoireResponse)
async def get_repertoire(repertoire_id: str) -> RepertoireResponse:
    r = _repo().get_repertoire(repertoire_id)
    if not r:
        raise HTTPException(status_code=404, detail="Repertoire not found.")
    return _repertoire_response(r)


@router.patch("/repertoires/{repertoire_id}", response_model=RepertoireResponse)
async def update_repertoire(
    repertoire_id: str, body: UpdateRepertoireRequest
) -> RepertoireResponse:
    r = _repo().update_repertoire(repertoire_id, name=body.name)
    if not r:
        raise HTTPException(status_code=404, detail="Repertoire not found.")
    return _repertoire_response(r)


@router.delete("/repertoires/{repertoire_id}")
async def delete_repertoire(repertoire_id: str) -> dict[str, str]:
    if not _repo().delete_repertoire(repertoire_id):
        raise HTTPException(status_code=404, detail="Repertoire not found.")
    return {"detail": "Repertoire deleted."}


@router.get(
    "/repertoires/{repertoire_id}/lines",
    response_model=list[LineSummaryResponse],
)
async def list_lines(repertoire_id: str) -> list[LineSummaryResponse]:
    if not _repo().get_repertoire(repertoire_id):
        raise HTTPException(status_code=404, detail="Repertoire not found.")
    repo = _repo()
    result = []
    for line in repo.list_lines(repertoire_id):
        plies = repo.get_plies(line.id)
        result.append(
            LineSummaryResponse(
                id=line.id,
                repertoire_id=line.repertoire_id,
                name=line.name,
                created_at=line.created_at,
                updated_at=line.updated_at,
                last_practiced_at=line.last_practiced_at,
                practice_attempt_count=line.practice_attempt_count,
                move_count=len(plies),
            )
        )
    return result


@router.post(
    "/repertoires/{repertoire_id}/lines",
    response_model=LineDetailResponse,
)
async def create_line(
    repertoire_id: str, body: CreateLineRequest
) -> LineDetailResponse:
    if not _repo().get_repertoire(repertoire_id):
        raise HTTPException(status_code=404, detail="Repertoire not found.")
    repo = _repo()
    line = repo.create_line(repertoire_id, body.name)
    return _line_detail(line, [], [])


@router.get("/lines/{line_id}", response_model=LineDetailResponse)
async def get_line(line_id: str) -> LineDetailResponse:
    repo = _repo()
    line = repo.get_line(line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    return _line_detail(
        line, repo.get_plies(line_id), repo.get_explanations(line_id)
    )


@router.patch("/lines/{line_id}", response_model=LineDetailResponse)
async def update_line(line_id: str, body: UpdateLineRequest) -> LineDetailResponse:
    repo = _repo()
    line = repo.update_line(
        line_id, name=body.name, record_practice=body.record_practice
    )
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    return _line_detail(
        line, repo.get_plies(line_id), repo.get_explanations(line_id)
    )


@router.delete("/lines/{line_id}")
async def delete_line(line_id: str) -> dict[str, str]:
    if not _repo().delete_line(line_id):
        raise HTTPException(status_code=404, detail="Line not found.")
    return {"detail": "Line deleted."}


@router.put("/lines/{line_id}/moves", response_model=LineDetailResponse)
async def replace_line_moves(
    line_id: str, body: ReplaceLineMovesRequest
) -> LineDetailResponse:
    repo = _repo()
    line = repo.get_line(line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    try:
        repo.replace_moves(line_id, [{"san": m.san} for m in body.moves])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    line = repo.get_line(line_id)
    return _line_detail(
        line, repo.get_plies(line_id), repo.get_explanations(line_id)
    )


@router.patch("/lines/{line_id}/plies/{ply_index}/key")
async def set_key_position(
    line_id: str, ply_index: int, body: KeyPositionRequest
) -> dict[str, bool]:
    repo = _repo()
    if not repo.get_line(line_id):
        raise HTTPException(status_code=404, detail="Line not found.")
    plies = repo.get_plies(line_id)
    if not any(p.ply_index == ply_index for p in plies):
        raise HTTPException(status_code=404, detail="Ply not found.")
    repo.set_key_position(line_id, ply_index, body.is_key)
    return {"is_key": body.is_key}


@router.post("/lines/{line_id}/generate-explanations", response_model=LineDetailResponse)
async def generate_explanations(
    line_id: str, body: GenerateExplanationsRequest
) -> LineDetailResponse:
    repo = _repo()
    line = repo.get_line(line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found.")
    repertoire = repo.get_repertoire(line.repertoire_id)
    if not repertoire:
        raise HTTPException(status_code=404, detail="Repertoire not found.")

    all_plies = repo.get_plies(line_id)
    all_sans = [p.san for p in all_plies]
    if body.ply_indices:
        teach = [p for p in all_plies if p.ply_index in body.ply_indices]
    else:
        teach = repo.teaching_plies(line_id)

    generator = OpeningCoachGenerator()
    try:
        outputs = await generator.generate_batch(
            repertoire.name, repertoire.color, teach, all_sans
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    for item in outputs:
        repo.upsert_explanation(
            line_id,
            item.ply_index,
            {
                "why_move": item.why_move,
                "strategic_idea": item.strategic_idea,
                "plan_text": item.plan_text,
                "watch_for": item.watch_for,
                "remember_this": item.remember_this,
            },
        )

    line = repo.get_line(line_id)
    return _line_detail(
        line, repo.get_plies(line_id), repo.get_explanations(line_id)
    )
