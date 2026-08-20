"use client";

import { Chess, Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";

export interface GameState {
  fen: string;
  turn: "white" | "black";
  moveHistory: string[];
  fullMoveHistory: string[];
  movePairs: string[][];
  /** Current move index (ply): 0 = start, N = after N moves */
  currentPly: number;
  currentMoveIndex: number;
  isAtLatestMove: boolean;
  isGameOver: boolean;
  gameResult: string | null;
}

function buildMovePairs(history: string[]): string[][] {
  const pairs: string[][] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1] ?? ""]);
  }
  return pairs;
}

export function buildGameAtPly(moves: string[], ply: number): Chess {
  const game = new Chess();
  for (let i = 0; i < ply && i < moves.length; i++) {
    game.move(moves[i]);
  }
  return game;
}

export function parseMovesFromPgn(pgn: string): string[] {
  const game = new Chess();
  game.loadPgn(pgn);
  return game.history();
}

export function useChessGame() {
  const [moves, setMoves] = useState<string[]>([]);
  const [currentPly, setCurrentPly] = useState(0);

  const game = useMemo(
    () => buildGameAtPly(moves, currentPly),
    [moves, currentPly],
  );

  const state: GameState = useMemo(
    () => ({
      fen: game.fen(),
      turn: game.turn() === "w" ? "white" : "black",
      moveHistory: moves.slice(0, currentPly),
      fullMoveHistory: moves,
      movePairs: buildMovePairs(moves),
      currentPly,
      currentMoveIndex: currentPly,
      isAtLatestMove: currentPly === moves.length,
      isGameOver: game.isGameOver(),
      gameResult: game.isGameOver()
        ? game.isCheckmate()
          ? `${game.turn() === "w" ? "Black" : "White"} wins by checkmate`
          : game.isDraw()
            ? "Draw"
            : "Game over"
        : null,
    }),
    [game, moves, currentPly],
  );

  const goToPly = useCallback(
    (ply: number) => {
      setCurrentPly(Math.max(0, Math.min(ply, moves.length)));
    },
    [moves.length],
  );

  const goForward = useCallback(() => {
    setCurrentPly((ply) => Math.min(ply + 1, moves.length));
  }, [moves.length]);

  const loadFromPgn = useCallback((pgn: string) => {
    try {
      const parsed = parseMovesFromPgn(pgn);
      setMoves(parsed);
      setCurrentPly(0);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadFromMoves = useCallback((sanMoves: string[]) => {
    setMoves(sanMoves);
    setCurrentPly(sanMoves.length);
  }, []);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      const copy = buildGameAtPly(moves, currentPly);
      try {
        const result = copy.move({ from, to, promotion: promotion ?? "q" });
        if (!result) return false;

        const truncated = moves.slice(0, currentPly);
        const newMoves = [...truncated, result.san];
        setMoves(newMoves);
        setCurrentPly(newMoves.length);
        return true;
      } catch {
        return false;
      }
    },
    [moves, currentPly],
  );

  const undoMove = useCallback(() => {
    setCurrentPly((ply) => Math.max(0, ply - 1));
  }, []);

  const goToPrevious = undoMove;

  const resetGame = useCallback(() => {
    setMoves([]);
    setCurrentPly(0);
  }, []);

  return {
    game,
    state,
    makeMove,
    undoMove,
    goToPrevious,
    resetGame,
    goToPly,
    goForward,
    loadFromPgn,
    loadFromMoves,
  };
}
