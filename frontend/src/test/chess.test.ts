import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { buildGameAtPly, parseMovesFromPgn } from "@/hooks/useChessGame";

describe("chess game logic", () => {
  it("starts at the standard position", () => {
    const game = new Chess();
    expect(game.fen()).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
  });

  it("allows legal moves", () => {
    const game = new Chess();
    const move = game.move("e4");
    expect(move?.san).toBe("e4");
    expect(game.history()).toEqual(["e4"]);
  });

  it("rejects illegal moves", () => {
    const game = new Chess();
    expect(() => game.move({ from: "e2", to: "e5" })).toThrow();
  });

  it("supports undo", () => {
    const game = new Chess();
    game.move("e4");
    game.undo();
    expect(game.history()).toEqual([]);
  });

  it("supports reset via new instance", () => {
    const game = new Chess();
    game.move("e4");
    const fresh = new Chess();
    expect(fresh.history()).toEqual([]);
  });

  it("builds move pairs correctly", () => {
    const game = new Chess();
    game.move("e4");
    game.move("e5");
    game.move("Nf3");
    const history = game.history();
    const pairs: string[][] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push([history[i], history[i + 1] ?? ""]);
    }
    expect(pairs).toEqual([["e4", "e5"], ["Nf3", ""]]);
  });

  it("rebuilds position at a specific ply", () => {
    const moves = ["d4", "d6", "Nf3", "Nf6", "c4", "g6"];
    const game = buildGameAtPly(moves, 6);
    expect(game.history()).toEqual(moves);
    expect(game.turn()).toBe("w");
  });

  it("returns starting position at ply zero", () => {
    const moves = ["e4", "e5"];
    const game = buildGameAtPly(moves, 0);
    expect(game.history()).toEqual([]);
    expect(game.fen()).toContain("rnbqkbnr/pppppppp");
  });

  it("parses moves from PGN", () => {
    const pgn =
      '[Event "Test"]\n[White "A"]\n[Black "B"]\n\n1. d4 d6 2. Nf3 Nf6 *';
    const moves = parseMovesFromPgn(pgn);
    expect(moves).toEqual(["d4", "d6", "Nf3", "Nf6"]);
  });

  it("tracks currentMoveIndex alias", () => {
    const moves = ["e4", "e5"];
    expect(buildGameAtPly(moves, 1).history().length).toBe(1);
    expect(buildGameAtPly(moves, 2).history().length).toBe(2);
  });
});
