"use client";

import { Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";
import { buildGameAtPly, useChessGame } from "@/hooks/useChessGame";
import {
  buildExplorationBoardState,
  buildExplorationPrefix,
  ExplorationBoardState,
  getExplorationVariationMoves,
  resolveAnalysisMoveIndex,
} from "@/lib/explorationState";

export interface ExplorationState {
  /** Full exploration line including shared prefix + alternative + continuations */
  moves: string[];
  /** Current position within the exploration line (ply) */
  currentPly: number;
  /** Original-game move index to restore on "Return to Game" */
  startMoveIndex: number;
  /** Fixed move index for Move Analysis coaching (immutable during exploration) */
  analysisMoveIndex: number;
  alternativeSan: string;
  originalSan: string;
}

export function useExploration(chessGame: ReturnType<typeof useChessGame>) {
  const [exploration, setExploration] = useState<ExplorationState | null>(
    null,
  );

  const isExploring = exploration !== null;

  const startExploration = useCallback(
    (moveIndex: number, suggestedSan: string, originalSan: string) => {
      const originalMoves = chessGame.state.fullMoveHistory;
      const prefix = buildExplorationPrefix(originalMoves, moveIndex);
      const probe = buildGameAtPly(prefix, prefix.length);
      try {
        const result = probe.move(suggestedSan);
        if (!result) return false;

        const startMoveIndex = chessGame.state.currentMoveIndex;
        setExploration({
          moves: [...prefix, result.san],
          currentPly: prefix.length + 1,
          startMoveIndex,
          analysisMoveIndex: moveIndex,
          alternativeSan: result.san,
          originalSan,
        });
        return true;
      } catch {
        return false;
      }
    },
    [chessGame.state.currentMoveIndex, chessGame.state.fullMoveHistory],
  );

  const returnToGame = useCallback(() => {
    if (!exploration) return;
    const restorePly = exploration.startMoveIndex;
    setExploration(null);
    chessGame.goToPly(restorePly);
  }, [chessGame, exploration]);

  const explorationMakeMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      if (!exploration) return false;
      const copy = buildGameAtPly(exploration.moves, exploration.currentPly);
      try {
        const result = copy.move({ from, to, promotion: promotion ?? "q" });
        if (!result) return false;
        const truncated = exploration.moves.slice(0, exploration.currentPly);
        const newMoves = [...truncated, result.san];
        setExploration({
          ...exploration,
          moves: newMoves,
          currentPly: newMoves.length,
        });
        return true;
      } catch {
        return false;
      }
    },
    [exploration],
  );

  const goToExplorationPly = useCallback(
    (ply: number) => {
      if (!exploration) return;
      setExploration({
        ...exploration,
        currentPly: Math.max(0, Math.min(ply, exploration.moves.length)),
      });
    },
    [exploration],
  );

  const goExplorationForward = useCallback(() => {
    if (!exploration) return;
    setExploration({
      ...exploration,
      currentPly: Math.min(
        exploration.currentPly + 1,
        exploration.moves.length,
      ),
    });
  }, [exploration]);

  const goExplorationPrevious = useCallback(() => {
    if (!exploration) return;
    setExploration({
      ...exploration,
      currentPly: Math.max(0, exploration.currentPly - 1),
    });
  }, [exploration]);

  const boardState: ExplorationBoardState | null = useMemo(() => {
    if (!exploration) return null;
    return buildExplorationBoardState(
      exploration.moves,
      exploration.currentPly,
    );
  }, [exploration]);

  const variationMoves = useMemo(() => {
    if (!exploration) return [];
    return getExplorationVariationMoves(
      exploration.moves,
      exploration.analysisMoveIndex,
    );
  }, [exploration]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      if (exploration !== null) {
        return explorationMakeMove(from, to, promotion);
      }
      return chessGame.makeMove(from, to, promotion);
    },
    [exploration, explorationMakeMove, chessGame.makeMove],
  );

  const goToPlyWrapped = useCallback(
    (ply: number) => {
      if (exploration !== null) {
        goToExplorationPly(ply);
        return;
      }
      chessGame.goToPly(ply);
    },
    [exploration, goToExplorationPly, chessGame.goToPly],
  );

  const goForwardWrapped = useCallback(() => {
    if (exploration !== null) {
      goExplorationForward();
      return;
    }
    chessGame.goForward();
  }, [exploration, goExplorationForward, chessGame.goForward]);

  const goToPreviousWrapped = useCallback(() => {
    if (exploration !== null) {
      goExplorationPrevious();
      return;
    }
    chessGame.goToPrevious();
  }, [exploration, goExplorationPrevious, chessGame.goToPrevious]);

  const analysisMoveIndex = resolveAnalysisMoveIndex(
    isExploring,
    exploration?.analysisMoveIndex ?? null,
    chessGame.state.currentMoveIndex,
  );

  return {
    exploration,
    isExploring,
    boardState,
    variationMoves,
    analysisMoveIndex,
    startExploration,
    returnToGame,
    makeMove,
    goToPly: goToPlyWrapped,
    goForward: goForwardWrapped,
    goToPrevious: goToPreviousWrapped,
  };
}

export {
  buildExplorationBoardState,
  buildExplorationPrefix,
  getExplorationVariationMoves,
  resolveAnalysisMoveIndex,
};
