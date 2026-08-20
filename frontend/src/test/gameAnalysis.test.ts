import { describe, expect, it } from "vitest";
import {
  classificationColor,
  getMoveAnalysisForPly,
  isAnalysisInProgress,
  makeGameId,
  type GameAnalysis,
} from "@/lib/gameAnalysis";

const sampleAnalysis: GameAnalysis = {
  game_id: "chesscom:123",
  source: "chesscom",
  source_game_id: "123",
  player_username: "Alice",
  opponent_username: "Bob",
  status: "COMPLETE",
  summary: "Good game",
  white_accuracy: 85,
  black_accuracy: 80,
  white_game_rating: 1400,
  black_game_rating: 1350,
  engine_version: "stockfish",
  engine_depth: 16,
  analysis_version: "v1",
  generated_at: "2026-08-19T00:00:00Z",
  progress_message: null,
  progress_current: 4,
  progress_total: 4,
  error_message: null,
  moves: [
    {
      move_index: 1,
      move_number: 1,
      side: "white",
      san: "e4",
      uci: "e2e4",
      fen_before: "start",
      fen_after: "after",
      evaluation_before: 0,
      evaluation_after: 0.2,
      best_move: null,
      best_move_san: "e4",
      principal_variation: [],
      centipawn_loss: 0,
      classification: "GOOD",
      is_critical: false,
      coaching_headline: "Solid opening",
      coaching_explanation: "A classic choice.",
      coaching_teaching_point: null,
      coaching_encouragement: null,
      suggested_move: null,
      suggested_move_san: null,
      suggested_line: null,
      coaching_generated: true,
    },
    {
      move_index: 2,
      move_number: 1,
      side: "black",
      san: "e5",
      uci: "e7e5",
      fen_before: "start",
      fen_after: "after",
      evaluation_before: 0.2,
      evaluation_after: 0.1,
      best_move: null,
      best_move_san: "Nf6",
      principal_variation: [],
      centipawn_loss: 50,
      classification: "MISTAKE",
      is_critical: true,
      coaching_headline: "Inaccurate reply",
      coaching_explanation: "Nf6 was stronger.",
      coaching_teaching_point: "Develop pieces.",
      coaching_encouragement: null,
      suggested_move: "Nf6",
      suggested_move_san: "Nf6",
      suggested_line: "Nf6 Nc3",
      coaching_generated: true,
    },
  ],
};

describe("gameAnalysis helpers", () => {
  it("builds stable game ids", () => {
    expect(makeGameId("chesscom", "abc")).toBe("chesscom:abc");
  });

  it("detects in-progress statuses", () => {
    expect(isAnalysisInProgress("ANALYZING")).toBe(true);
    expect(isAnalysisInProgress("COMPLETE")).toBe(false);
  });

  it("finds move analysis by ply", () => {
    expect(getMoveAnalysisForPly(sampleAnalysis, 2)?.san).toBe("e5");
    expect(getMoveAnalysisForPly(sampleAnalysis, 0)).toBeNull();
  });

  it("maps classification colors", () => {
    expect(classificationColor("BLUNDER")).toContain("red");
    expect(classificationColor("GOOD")).toContain("green");
  });
});
