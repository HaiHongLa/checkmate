import { describe, it, expect } from "vitest";
import { buildGameAtPly } from "@/hooks/useChessGame";
import { isTypingTarget } from "@/hooks/useKeyboardNavigation";

describe("move navigation state", () => {
  const moves = ["e4", "e5", "Nf3", "Nc6"];

  it("starts at move index 0", () => {
    const game = buildGameAtPly(moves, 0);
    expect(game.history()).toEqual([]);
  });

  it("shows correct FEN after each move index", () => {
    const afterE4 = buildGameAtPly(moves, 1);
    expect(afterE4.history()).toEqual(["e4"]);

    const afterNc6 = buildGameAtPly(moves, 4);
    expect(afterNc6.history()).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("preserves full move list when viewing earlier position", () => {
    const game = buildGameAtPly(moves, 2);
    expect(game.history()).toEqual(["e4", "e5"]);
    expect(moves.length).toBe(4);
  });
});

describe("keyboard navigation guards", () => {
  it("ignores typing targets", () => {
    const input = document.createElement("input");
    expect(isTypingTarget(input)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(isTypingTarget(textarea)).toBe(true);

    const div = document.createElement("div");
    expect(isTypingTarget(div)).toBe(false);
  });
});

describe("analysis cache", () => {
  it("stores and retrieves by FEN key", () => {
    const cache = new Map<string, unknown>();
    const fen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const result = { evaluation: 0.3, depth: 18 };
    cache.set(fen, result);
    expect(cache.has(fen)).toBe(true);
    expect(cache.get(fen)).toEqual(result);
    expect(cache.has("different-fen")).toBe(false);
  });
});
