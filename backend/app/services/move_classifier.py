from dataclasses import dataclass
from enum import Enum


class AnalysisStatus(str, Enum):
    NOT_ANALYZED = "NOT_ANALYZED"
    QUEUED = "QUEUED"
    ANALYZING = "ANALYZING"
    GENERATING_COACHING = "GENERATING_COACHING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class MoveClassification(str, Enum):
    BRILLIANT = "BRILLIANT"
    GREAT = "GREAT"
    GOOD = "GOOD"
    BOOK = "BOOK"
    INACCURACY = "INACCURACY"
    MISTAKE = "MISTAKE"
    BLUNDER = "BLUNDER"
    FORCED = "FORCED"


@dataclass(frozen=True)
class ClassificationThresholds:
    brilliant_max_loss: float = 5
    great_max_loss: float = 10
    good_max_loss: float = 25
    inaccuracy_max_loss: float = 50
    mistake_max_loss: float = 100
    critical_min_loss: float = 30
    book_move_limit: int = 8


DEFAULT_THRESHOLDS = ClassificationThresholds()


@dataclass
class MoveEvalContext:
    move_index: int
    side: str
    san: str
    uci: str
    fen_before: str
    evaluation_before: float
    evaluation_after: float
    best_move_san: str | None
    best_move_uci: str | None
    centipawn_loss: float
    is_book: bool = False
    is_forced: bool = False
    is_only_move: bool = False


def compute_centipawn_loss(
    eval_before: float,
    eval_after: float,
    side: str,
) -> float:
    if side == "white":
        loss = eval_before - eval_after
    else:
        loss = eval_after - eval_before
    return max(0.0, loss * 100)


def classify_move(
    ctx: MoveEvalContext,
    thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS,
) -> tuple[MoveClassification, bool]:
    if ctx.is_forced or ctx.is_only_move:
        return MoveClassification.FORCED, False

    if ctx.is_book and ctx.move_index <= thresholds.book_move_limit * 2:
        return MoveClassification.BOOK, False

    loss = ctx.centipawn_loss
    played_best = (
        ctx.best_move_san is not None
        and ctx.san.rstrip("+#") == ctx.best_move_san.rstrip("+#")
    ) or (ctx.best_move_uci is not None and ctx.uci == ctx.best_move_uci)

    if played_best and loss <= thresholds.brilliant_max_loss:
        classification = (
            MoveClassification.BRILLIANT if loss <= 2 else MoveClassification.GREAT
        )
    elif loss <= thresholds.great_max_loss and played_best:
        classification = MoveClassification.GREAT
    elif loss <= thresholds.good_max_loss:
        classification = MoveClassification.GOOD
    elif loss <= thresholds.inaccuracy_max_loss:
        classification = MoveClassification.INACCURACY
    elif loss <= thresholds.mistake_max_loss:
        classification = MoveClassification.MISTAKE
    else:
        classification = MoveClassification.BLUNDER

    is_critical = loss >= thresholds.critical_min_loss or classification in (
        MoveClassification.INACCURACY,
        MoveClassification.MISTAKE,
        MoveClassification.BLUNDER,
        MoveClassification.BRILLIANT,
        MoveClassification.GREAT,
    )

    return classification, is_critical


def compute_accuracy(classifications: list[str], side: str, moves_sides: list[str]) -> float:
    side_moves = [c for c, s in zip(classifications, moves_sides, strict=False) if s == side]
    if not side_moves:
        return 0.0

    weights = {
        MoveClassification.BRILLIANT.value: 100,
        MoveClassification.GREAT.value: 95,
        MoveClassification.GOOD.value: 90,
        MoveClassification.BOOK.value: 92,
        MoveClassification.FORCED.value: 95,
        MoveClassification.INACCURACY.value: 75,
        MoveClassification.MISTAKE.value: 50,
        MoveClassification.BLUNDER.value: 20,
    }
    return round(sum(weights.get(c, 80) for c in side_moves) / len(side_moves), 1)


def estimate_game_rating(accuracy: float, base: float = 1200) -> float:
    return round(base + (accuracy - 70) * 15, 0)
