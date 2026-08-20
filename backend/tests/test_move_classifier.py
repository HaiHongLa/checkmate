from app.services.move_classifier import (
    MoveClassification,
    MoveEvalContext,
    classify_move,
    compute_accuracy,
    compute_centipawn_loss,
    estimate_game_rating,
)


def test_centipawn_loss_white():
    loss = compute_centipawn_loss(0.5, 0.2, "white")
    assert loss == 30.0


def test_centipawn_loss_black():
    loss = compute_centipawn_loss(-0.3, 0.1, "black")
    assert loss == 40.0


def test_classify_blunder():
    ctx = MoveEvalContext(
        move_index=10,
        side="white",
        san="Qh4",
        uci="h5h4",
        fen_before="start",
        evaluation_before=1.0,
        evaluation_after=-2.0,
        best_move_san="Nf3",
        best_move_uci="g1f3",
        centipawn_loss=300,
    )
    classification, is_critical = classify_move(ctx)
    assert classification == MoveClassification.BLUNDER
    assert is_critical is True


def test_classify_great_when_best_move():
    ctx = MoveEvalContext(
        move_index=5,
        side="white",
        san="Nf3",
        uci="g1f3",
        fen_before="start",
        evaluation_before=0.1,
        evaluation_after=0.2,
        best_move_san="Nf3",
        best_move_uci="g1f3",
        centipawn_loss=0,
    )
    classification, _ = classify_move(ctx)
    assert classification in (MoveClassification.GREAT, MoveClassification.BRILLIANT)


def test_accuracy_and_rating():
    classifications = ["GOOD", "MISTAKE", "GOOD"]
    sides = ["white", "white", "black"]
    white_acc = compute_accuracy(classifications, "white", sides)
    assert 50 < white_acc < 100
    rating = estimate_game_rating(white_acc)
    assert rating > 1000
