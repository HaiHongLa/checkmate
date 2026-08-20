import { Chess } from "chess.js";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildGameAtPly, useChessGame } from "@/hooks/useChessGame";
import { useExploration } from "@/hooks/useExploration";
import {
  buildExplorationBoardState,
  buildExplorationPrefix,
  getExplorationVariationMoves,
  resolveAnalysisMoveIndex,
} from "@/lib/explorationState";
import { getMoveAnalysisForPly, type GameAnalysis } from "@/lib/gameAnalysis";

const ORIGINAL_MOVES = [
  "e4",
  "e5",
  "Nf3",
  "Nc6",
  "Bb5",
  "a6",
  "Ba4",
  "Nf6",
];

function makeSampleAnalysis(): GameAnalysis {
  return {
    game_id: "chesscom:test",
    source: "chesscom",
    source_game_id: "test",
    player_username: "Alice",
    opponent_username: "Bob",
    status: "COMPLETE",
    summary: "Test summary",
    white_accuracy: 85,
    black_accuracy: 80,
    white_game_rating: 1400,
    black_game_rating: 1350,
    engine_version: "stockfish",
    engine_depth: 16,
    analysis_version: "v1",
    generated_at: "2026-08-19T00:00:00Z",
    progress_message: null,
    progress_current: 8,
    progress_total: 8,
    error_message: null,
    moves: [
      {
        move_index: 5,
        move_number: 3,
        side: "white",
        san: "Bb5",
        uci: "f1b5",
        fen_before: "fen",
        fen_after: "fen2",
        evaluation_before: 0.3,
        evaluation_after: 0.2,
        best_move: null,
        best_move_san: "Bc4",
        principal_variation: ["Bc4"],
        centipawn_loss: 45,
        classification: "INACCURACY",
        is_critical: true,
        coaching_headline: "Inaccurate bishop move",
        coaching_explanation: "Bc4 keeps more pressure.",
        coaching_teaching_point: "Develop with tempo.",
        coaching_encouragement: null,
        suggested_move: "Bc4",
        suggested_move_san: "Bc4",
        suggested_line: "Bc4 Nf6",
        coaching_generated: true,
      },
      {
        move_index: 6,
        move_number: 3,
        side: "black",
        san: "a6",
        uci: "a7a6",
        fen_before: "fen",
        fen_after: "fen2",
        evaluation_before: 0.2,
        evaluation_after: 0.1,
        best_move: null,
        best_move_san: "d6",
        principal_variation: [],
        centipawn_loss: 20,
        classification: "GOOD",
        is_critical: false,
        coaching_headline: "Solid",
        coaching_explanation: "Fine move.",
        coaching_teaching_point: null,
        coaching_encouragement: null,
        suggested_move: null,
        suggested_move_san: null,
        suggested_line: null,
        coaching_generated: true,
      },
    ],
  };
}

function renderExplorationHarness() {
  return renderHook(() => {
    const chessGame = useChessGame();
    const exploration = useExploration(chessGame);
    return { chessGame, exploration };
  });
}

describe("resolveAnalysisMoveIndex", () => {
  it("returns original index outside exploration", () => {
    expect(resolveAnalysisMoveIndex(false, null, 5)).toBe(5);
  });

  it("returns frozen analysis index during exploration", () => {
    expect(resolveAnalysisMoveIndex(true, 5, 8)).toBe(5);
    expect(resolveAnalysisMoveIndex(true, 5, 9)).toBe(5);
  });
});

describe("exploration branch helpers", () => {
  it("builds prefix without mutating original moves", () => {
    const prefix = buildExplorationPrefix(ORIGINAL_MOVES, 5);
    expect(prefix).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(ORIGINAL_MOVES).toHaveLength(8);
  });

  it("can play suggested alternative from prefix position", () => {
    const prefix = buildExplorationPrefix(ORIGINAL_MOVES, 5);
    const game = buildGameAtPly(prefix, prefix.length);
    const result = game.move("Bc4");
    expect(result?.san).toBe("Bc4");
    expect(game.history()).toEqual(["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  });

  it("keeps analysis move fixed as exploration ply advances", () => {
    const prefix = buildExplorationPrefix(ORIGINAL_MOVES, 5);
    const line = [...prefix, "Bc4", "Nf6", "d4"];
    const atStart = buildExplorationBoardState(line, 5);
    const afterTwo = buildExplorationBoardState(line, 7);

    expect(atStart.currentPly).toBe(5);
    expect(afterTwo.currentPly).toBe(7);
    expect(resolveAnalysisMoveIndex(true, 5, 5)).toBe(5);
    expect(resolveAnalysisMoveIndex(true, 5, 7)).toBe(5);
  });

  it("shows variation moves from branch point only", () => {
    const prefix = buildExplorationPrefix(ORIGINAL_MOVES, 5);
    const line = [...prefix, "Bc4", "Nf6"];
    expect(getExplorationVariationMoves(line, 5)).toEqual(["Bc4", "Nf6"]);
  });
});

describe("move analysis selection during exploration", () => {
  it("does not switch to the next original move after exploration moves", () => {
    const analysis = makeSampleAnalysis();
    const analysisMoveIndex = 5;

    expect(getMoveAnalysisForPly(analysis, analysisMoveIndex)?.san).toBe("Bb5");

    for (const boardPly of [6, 7, 8, 9]) {
      const resolved = resolveAnalysisMoveIndex(true, analysisMoveIndex, boardPly);
      expect(resolved).toBe(5);
      expect(getMoveAnalysisForPly(analysis, resolved)?.san).toBe("Bb5");
    }
  });
});

describe("useExploration hook", () => {
  it("preserves original game and fixed analysis index while exploring", () => {
    const { result } = renderExplorationHarness();

    act(() => {
      result.current.chessGame.loadFromMoves(ORIGINAL_MOVES);
    });

    act(() => {
      result.current.chessGame.goToPly(5);
    });

    const originalBefore = [...result.current.chessGame.state.fullMoveHistory];

    act(() => {
      result.current.exploration.startExploration(5, "Bc4", "Bb5");
    });

    expect(result.current.exploration.isExploring).toBe(true);
    expect(result.current.exploration.analysisMoveIndex).toBe(5);

    act(() => {
      result.current.exploration.makeMove("g8", "f6");
    });

    act(() => {
      result.current.exploration.makeMove("d2", "d4");
    });

    expect(result.current.chessGame.state.fullMoveHistory).toEqual(
      originalBefore,
    );
    expect(result.current.chessGame.state.currentMoveIndex).toBe(5);
    expect(result.current.exploration.analysisMoveIndex).toBe(5);
    expect(result.current.exploration.exploration?.moves.length).toBeGreaterThan(
      5,
    );
  });

  it("returns to the original move after leaving exploration", () => {
    const { result } = renderExplorationHarness();

    act(() => {
      result.current.chessGame.loadFromMoves(ORIGINAL_MOVES);
    });

    act(() => {
      result.current.chessGame.goToPly(5);
    });

    act(() => {
      result.current.exploration.startExploration(5, "Bc4", "Bb5");
    });

    act(() => {
      result.current.exploration.makeMove("g8", "f6");
    });

    act(() => {
      result.current.exploration.returnToGame();
    });

    expect(result.current.exploration.isExploring).toBe(false);
    expect(result.current.chessGame.state.currentMoveIndex).toBe(5);
  });

  it("supports a second exploration after returning to the game", () => {
    const { result } = renderExplorationHarness();

    act(() => {
      result.current.chessGame.loadFromMoves(ORIGINAL_MOVES);
    });

    act(() => {
      result.current.chessGame.goToPly(5);
    });

    act(() => {
      result.current.exploration.startExploration(5, "Bc4", "Bb5");
    });
    act(() => {
      result.current.exploration.returnToGame();
    });
    act(() => {
      result.current.exploration.startExploration(5, "Bc4", "Bb5");
    });

    expect(result.current.exploration.isExploring).toBe(true);
    expect(result.current.exploration.analysisMoveIndex).toBe(5);
  });
});

describe("move validation for exploration", () => {
  it("rejects illegal suggested moves", () => {
    const game = new Chess();
    game.move("e4");
    expect(() => game.move("Ke2")).toThrow();
  });
});
